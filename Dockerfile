FROM maven:3.9-amazoncorretto-21
WORKDIR /app

COPY pom.xml .
COPY src ./src

RUN mvn clean package -DskipTests

EXPOSE 8123

CMD ["java", "-jar", "/app/target/ai-agent-1.0-SNAPSHOT.jar", "--spring.profiles.active=prod"]
