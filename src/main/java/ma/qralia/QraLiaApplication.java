package ma.qralia;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class QraLiaApplication {

    public static void main(String[] args) {
        SpringApplication.run(QraLiaApplication.class, args);
    }
}
