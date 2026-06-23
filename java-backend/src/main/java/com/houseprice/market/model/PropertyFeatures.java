package com.houseprice.market.model;

public record PropertyFeatures(
    double square_footage,
    double bedrooms,
    double bathrooms,
    double year_built,
    double lot_size,
    double distance_to_city_center,
    double school_rating) {
}