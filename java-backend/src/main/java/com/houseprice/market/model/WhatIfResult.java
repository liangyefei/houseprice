package com.houseprice.market.model;

public record WhatIfResult(
    double prediction,
    double averagePrice,
    double deltaFromAverage,
    double premiumPercent) {
}