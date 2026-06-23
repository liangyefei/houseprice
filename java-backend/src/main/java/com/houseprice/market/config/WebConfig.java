package com.houseprice.market.config;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Enables in-memory caching (used by the market summary endpoint) and permissive CORS so the
 * Next.js portal can call the Java API directly during a live demo if desired.
 */
@Configuration
@EnableCaching
public class WebConfig implements WebMvcConfigurer {

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    registry.addMapping("/api/**")
        .allowedOrigins("http://localhost:3000", "http://127.0.0.1:3000")
        .allowedMethods("GET", "POST", "OPTIONS")
        .allowedHeaders("*");
  }
}
