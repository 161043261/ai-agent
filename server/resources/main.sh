cd ./src/main/resources || exit

git clone git@github.com:161043261/homepage.git

mv ./homepage/docs ./

echo "*" > ./docs/.gitignore
