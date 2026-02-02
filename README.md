# AI Agent

.git/hooks/pre-commit

```bash
#!/bin/bash
echo "Formatting main project..."
mvn com.spotify.fmt:fmt-maven-plugin:2.25:format -q

if [ $? -ne 0 ]; then
    echo "Main project formatting failed!"
    exit 1
fi

echo "Formatting mcp-server..."
cd ./mcp-server
mvn com.spotify.fmt:fmt-maven-plugin:2.25:format -q
FORMAT_RESULT=$?
cd ..

if [ $FORMAT_RESULT -ne 0 ]; then
    echo "mcp-server formatting failed!"
    exit 1
fi

git diff --name-only --cached -- '*.java' | xargs -r git add

echo "Code formatted successfully!"
exit 0
```

```bash
git clone git@github.com:161043261/homepage.git
echo "*" > ./homepage/docs/base/.gitignore
mv ./homepage/docs/base ./src/main/resources/docs
rm -rf ./homepage

mvn spring-boot:run &> ./spring-boot.log
```
