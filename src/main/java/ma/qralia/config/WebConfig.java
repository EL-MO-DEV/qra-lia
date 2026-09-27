package ma.qralia.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final AppProperties properties;

    public WebConfig(AppProperties properties) {
        this.properties = properties;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        var origins = properties.cors().allowedOrigins();
        if (origins == null || origins.isEmpty()) {
            return;
        }
        var cleaned = origins.stream().filter(StringUtils::hasText).toArray(String[]::new);
        if (cleaned.length == 0) {
            return;
        }
        registry.addMapping("/api/**")
                .allowedOrigins(cleaned)
                .allowedMethods("POST", "OPTIONS")
                .allowedHeaders("Content-Type", "X-Request-Id", "X-Mock-Scenario")
                .maxAge(3600);
    }
}
