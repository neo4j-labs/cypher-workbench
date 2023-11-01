#!/bin/sh
echo ">>> Removing ./ui folder"
./cleanup_ui.sh $1
echo ">>> Copying ./ui folder without node_modules"
rsync -av --progress ../../ui . --exclude node_modules
cd ui
rm ./public/config/env-config.js
rm ./.env.development*
rm ./.env.my.development*
rm ./.env.test*
rm ./.env.production*
rmdir ./public/config
echo ">>> Doing Solutions Workbench Labs build"
#Commenting out so the enterprise files remain
#node build_basic.js
if [ "$1" = "-skipNpmInstall" ]
then
    echo ">>> Skipping npm install"
    mv ../keep/node_modules .
else
    echo ">>> Doing npm install"
    npm install
fi
echo ">>> Copying .env file"
cp ../ui.env ./.env
echo ">>> Doing react build"
npm run build
rm -rf docker_context/
mkdir docker_context
mv ./build docker_context
cp nginx.conf docker_context
cd ..
echo ">>> Doing docker build"
docker build -f Dockerfile.ui ./ui/docker_context -t solutions-workbench-ui:${WORKBENCH_VERSION}_labs
