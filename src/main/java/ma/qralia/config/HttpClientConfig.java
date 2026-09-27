package ma.qralia.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

import java.time.Duration;

@Configuration
public class HttpClientConfig {

    @Bean
    RestClient.Builder restClientBuilder(AppProperties properties) {
        var factory = new org.springframework.http.client.JdkClientHttpRequestFactory(
                java.net.http.HttpClient.newBuilder()
                        .connectTimeout(Duration.ofSeconds(properties.aiTimeoutSeconds()))
                        .build()
        );
        factory.setReadTimeout(Duration.ofSeconds(properties.aiTimeoutSeconds()));
        return RestClient.builder().requestFactory(factory);
    }
}
