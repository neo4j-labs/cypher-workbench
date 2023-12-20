#!/bin/sh
echo ">>> Removing ./api folder"
./cleanup_api.sh $1
echo ">>> Copying ./api folder without node_modules"
rsync -av --progress ../../api . --exclude node_modules
cd api
rm ./license.lic
rm ./.env.development*
rm ./.env.my.development*
rm ./.env.test*
rm ./.env.production*
echo ">>> Doing Cypher Workbench Labs build"
#Commenting out so the enterprise files remain
if [ "$1" = "-skipNpmInstall" ]
then
    echo ">>> Skipping npm install"
    mv ../keep/node_modules .
else
    echo ">>> Doing npm install"
    npm install
fi
echo ">>> Doing npm build"
npm run build
cd ..
cp ./api.env ./api/dist/.env
echo ">>> Doing docker build"
docker build -f Dockerfile.api ./api -t cypher-workbench-api:${WORKBENCH_VERSION}_labs
