package com.houseprice.market.model;

import java.util.List;

public record MarketFilters(List<Double> bedrooms, double minPrice, double maxPrice) {
}