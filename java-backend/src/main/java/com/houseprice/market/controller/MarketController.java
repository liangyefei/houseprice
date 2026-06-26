package com.houseprice.market.controller;

import com.houseprice.market.model.MarketFilters;
import com.houseprice.market.model.MarketSummary;
import com.houseprice.market.model.PropertyFeatures;
import com.houseprice.market.model.WhatIfResult;
import com.houseprice.market.service.MarketAnalysisService;
import java.util.Arrays;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/market")
public class MarketController {
  private final MarketAnalysisService service;

  public MarketController(MarketAnalysisService service) {
    this.service = service;
  }

  @GetMapping("/summary")
  public MarketSummary summary(
      @RequestParam(name = "bedrooms", required = false) String bedrooms,
      @RequestParam(name = "minPrice", required = false, defaultValue = "0") double minPrice,
      @RequestParam(name = "maxPrice", required = false, defaultValue = "1.7976931348623157E308") double maxPrice) {
    List<Double> bedroomValues = bedrooms == null || bedrooms.trim().isEmpty()
        ? List.of()
        : Arrays.stream(bedrooms.split(","))
            .map(String::trim)
            .filter(value -> !value.isEmpty())
            .map(Double::parseDouble)
            .toList();
    return service.getSummary(new MarketFilters(bedroomValues, minPrice, maxPrice));
  }

  @PostMapping("/what-if")
  public WhatIfResult whatIf(@RequestBody WhatIfRequest request) {
    return service.analyze(request.features());
  }

  public record WhatIfRequest(PropertyFeatures features) {}
}