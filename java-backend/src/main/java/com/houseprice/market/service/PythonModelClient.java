package com.houseprice.market.service;

import com.houseprice.market.model.PropertyFeatures;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class PythonModelClient {
  private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
  private final URI baseUri;

  public PythonModelClient(@Value("${app.python-api-url:http://127.0.0.1:8000}") String pythonApiUrl) {
    this.baseUri = URI.create(pythonApiUrl);
  }

  public double predict(PropertyFeatures features) {
    try {
      var body = Map.of("features", features);
      String json = JsonHelper.toJson(body);
      HttpRequest request = HttpRequest.newBuilder(baseUri.resolve("/predict"))
          .header("Content-Type", "application/json")
          .POST(HttpRequest.BodyPublishers.ofString(json))
          .timeout(Duration.ofSeconds(5))
          .build();

      HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() >= 200 && response.statusCode() < 300) {
        PredictionResponse parsed = JsonHelper.fromJson(response.body(), PredictionResponse.class);
        return parsed.predictions().isEmpty() ? 0 : parsed.predictions().get(0);
      }
    } catch (Exception ignored) {
      // Fall through to local fallback.
    }

    return fallbackEstimate(features);
  }

  private double fallbackEstimate(PropertyFeatures features) {
    return (features.square_footage() * 180.0)
        + (features.school_rating() * 15000.0)
        + (features.bedrooms() * 10000.0)
        + (features.bathrooms() * 12000.0)
        - (features.distance_to_city_center() * 3500.0)
        + (features.lot_size() * 4.0);
  }

  private record PredictionResponse(List<Double> predictions) {}

  private static final class JsonHelper {
    private static final com.fasterxml.jackson.databind.ObjectMapper MAPPER = new com.fasterxml.jackson.databind.ObjectMapper();

    private JsonHelper() {
    }

    static String toJson(Object value) throws Exception {
      return MAPPER.writeValueAsString(value);
    }

    static <T> T fromJson(String json, Class<T> type) throws Exception {
      return MAPPER.readValue(json, type);
    }
  }
}