package com.github.tianchenghang;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(
    exclude = {
      // DataSourceAutoConfiguration.class
    })
public class App {

  public static void main(String[] args) {
    SpringApplication.run(App.class, args);
  }
}
