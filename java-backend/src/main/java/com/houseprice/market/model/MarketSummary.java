package com.houseprice.market.model;

import java.util.List;

public record MarketSummary(
    int totalListings,
    double averagePrice,
    double medianPrice,
    double minPrice,
    double maxPrice,
    double averageSquareFootage,
    double averageSchoolRating,
    double averageDistance,
    List<Bucket> priceBands,
    List<BedroomSegment> bedroomSegments,
    List<MarketRecord> topComparables,
    Metrics modelMetrics) {

  public record Bucket(String label, int count) {}

  public record BedroomSegment(String label, int count, double averagePrice) {}

  public record Metrics(double r2, double rmse, double mae) {}
}