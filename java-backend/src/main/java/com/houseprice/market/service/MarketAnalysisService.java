package com.houseprice.market.service;

import com.houseprice.market.model.MarketFilters;
import com.houseprice.market.model.MarketRecord;
import com.houseprice.market.model.MarketSummary;
import com.houseprice.market.model.PropertyFeatures;
import com.houseprice.market.model.WhatIfResult;
import jakarta.annotation.PostConstruct;
import java.io.BufferedReader;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.DoubleStream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class MarketAnalysisService {
  private final PythonModelClient pythonModelClient;
  private final Path datasetPath;
  private final AtomicReference<CachedSummary> cachedSummary = new AtomicReference<>();
  private List<MarketRecord> records = List.of();

  public MarketAnalysisService(
      PythonModelClient pythonModelClient,
      @Value("${app.dataset-path:../data/House Price Dataset.csv}") String datasetPath) {
    this.pythonModelClient = pythonModelClient;
    this.datasetPath = Path.of(datasetPath);
  }

  @PostConstruct
  public void loadDataset() throws IOException {
    try (BufferedReader reader = Files.newBufferedReader(datasetPath)) {
      String headerLine = reader.readLine();
      if (headerLine == null) {
        records = List.of();
        return;
      }

      String[] headers = headerLine.split(",");
      List<MarketRecord> loaded = new ArrayList<>();
      String line;
      while ((line = reader.readLine()) != null) {
        if (line.trim().isEmpty()) {
          continue;
        }

        String[] values = line.split(",");
        Map<String, String> row = new HashMap<>();
        for (int index = 0; index < headers.length && index < values.length; index++) {
          row.put(headers[index].trim(), values[index].trim());
        }

        loaded.add(new MarketRecord(
            Integer.parseInt(row.getOrDefault("id", "0")),
            Double.parseDouble(row.getOrDefault("square_footage", "0")),
            Double.parseDouble(row.getOrDefault("bedrooms", "0")),
            Double.parseDouble(row.getOrDefault("bathrooms", "0")),
            Double.parseDouble(row.getOrDefault("year_built", "0")),
            Double.parseDouble(row.getOrDefault("lot_size", "0")),
            Double.parseDouble(row.getOrDefault("distance_to_city_center", "0")),
            Double.parseDouble(row.getOrDefault("school_rating", "0")),
            Double.parseDouble(row.getOrDefault("price", "0"))));
      }

      records = List.copyOf(loaded);
      cachedSummary.set(null);
    }
  }

  public List<MarketRecord> getRecords() {
    return records;
  }

  public MarketSummary getSummary(MarketFilters filters) {
    CachedSummary cached = cachedSummary.get();
    long now = Instant.now().toEpochMilli();
    if (cached != null && cached.expiryEpochMillis > now && Objects.equals(cached.filters, filters)) {
      return cached.summary;
    }

    List<MarketRecord> filtered = applyFilters(records, filters);
    MarketSummary summary = summarize(filtered);
    cachedSummary.set(new CachedSummary(filters, summary, now + 300_000L));
    return summary;
  }

  public WhatIfResult analyze(PropertyFeatures features) {
    double prediction = pythonModelClient.predict(features);
    double marketAverage = records.stream().mapToDouble(MarketRecord::price).average().orElse(0.0);
    double deltaFromAverage = prediction - marketAverage;
    double premiumPercent = marketAverage == 0.0 ? 0.0 : (deltaFromAverage / marketAverage) * 100.0;
    return new WhatIfResult(prediction, marketAverage, deltaFromAverage, premiumPercent);
  }

  private List<MarketRecord> applyFilters(List<MarketRecord> source, MarketFilters filters) {
    return source.stream()
        .filter(record -> filters.bedrooms() == null || filters.bedrooms().isEmpty() || filters.bedrooms().contains(record.bedrooms()))
        .filter(record -> record.price() >= filters.minPrice() && record.price() <= filters.maxPrice())
        .toList();
  }

  private MarketSummary summarize(List<MarketRecord> source) {
    List<Double> prices = source.stream().map(MarketRecord::price).sorted().toList();
    double averagePrice = source.stream().mapToDouble(MarketRecord::price).average().orElse(0.0);
    double medianPrice = prices.isEmpty() ? 0.0 : prices.get(prices.size() / 2);
    double minPrice = prices.isEmpty() ? 0.0 : prices.get(0);
    double maxPrice = prices.isEmpty() ? 0.0 : prices.get(prices.size() - 1);

    List<MarketSummary.Bucket> priceBands = List.of(
        new MarketSummary.Bucket("< $200k", (int) source.stream().filter(record -> record.price() < 200000).count()),
        new MarketSummary.Bucket("$200k - $275k", (int) source.stream().filter(record -> record.price() >= 200000 && record.price() < 275000).count()),
        new MarketSummary.Bucket("$275k - $350k", (int) source.stream().filter(record -> record.price() >= 275000 && record.price() < 350000).count()),
        new MarketSummary.Bucket("$350k+", (int) source.stream().filter(record -> record.price() >= 350000).count())
    );

    List<Double> bedroomCounts = source.stream().map(MarketRecord::bedrooms).distinct().sorted().toList();
    List<MarketSummary.BedroomSegment> bedroomSegments = bedroomCounts.stream()
        .map(count -> {
          List<MarketRecord> group = source.stream().filter(record -> record.bedrooms() == count).toList();
          double groupAverage = group.stream().mapToDouble(MarketRecord::price).average().orElse(0.0);
          return new MarketSummary.BedroomSegment(String.format("%.0f BR", count), group.size(), groupAverage);
        })
        .toList();

    List<MarketRecord> topComparables = source.stream()
        .sorted(Comparator.comparingDouble(MarketRecord::price).reversed())
        .limit(6)
        .toList();

    return new MarketSummary(
        source.size(),
        averagePrice,
        medianPrice,
        minPrice,
        maxPrice,
        source.stream().mapToDouble(MarketRecord::square_footage).average().orElse(0.0),
        source.stream().mapToDouble(MarketRecord::school_rating).average().orElse(0.0),
        source.stream().mapToDouble(MarketRecord::distance_to_city_center).average().orElse(0.0),
        priceBands,
        bedroomSegments,
        topComparables,
        new MarketSummary.Metrics(0.9811236825879982, 10277.04797106169, 7916.1980620897375));
  }

  private record CachedSummary(MarketFilters filters, MarketSummary summary, long expiryEpochMillis) {}
}