#!/bin/sh
if [ -z "$WORKBENCH_VERSION" ]
then
    echo "WORKBENCH_VERSION must be set first by running command:"
    echo "  source ./getVersion.sh"
    exit 1
else
    echo "WORKBENCH_VERSION is ${WORKBENCH_VERSION}, ok to proceed? (y/n)"
    read isVersionOk
    if [ "$isVersionOk" != "y" ]
    then
        echo "Stopping build, re-run when version is ok."
        exit 1
    else
        echo "Building with WORKBENCH_VERSION ${WORKBENCH_VERSION}"
    fi
fi

echo ""
echo "*** Building Labs ***"
echo ""
echo "*** Cleaning build folder ***"
echo ""
find ./build -exec rm -rdf "{}" \;
mkdir build
echo ""
echo "*** Building api ***"
echo ""
cd api
./build_labs.sh $1
cd ..
echo ""
echo "*** Building ui ***"
echo ""
cd ui
./build_labs.sh $1
cd ..
echo ""
echo "*** Packaging docker images ***"
echo ""
docker save solutions-workbench-ui:${WORKBENCH_VERSION}_labs solutions-workbench-api:${WORKBENCH_VERSION}_labs | gzip > workbenchDocker.tar.gz
mv workbenchDocker.tar.gz ./build
### Packaging Config
echo ""
echo "*** Packaging config ***"
echo ""
# copy license file
rm ./sw-config/sw-config/sw-api/license.li*
cp ../api/license.lic.labs ./sw-config/sw-config/sw-api/license.lic
cd sw-config
# copy create-user scripts
mkdir scripts
cd scripts
cp ../../../api/scripts/create-user.sh .
cp ../../../api/scripts/make-credential-file.sh .
cd ..
# compress all config sub-directories into tar file
tar cvfz sw-config.tar.gz *
mv sw-config.tar.gz ../build
cd ..
### Creating docker-compose file
sed 's|${WORKBENCH_VERSION}|'$WORKBENCH_VERSION'|g' ./workbench_labs_files/docker-compose-labs.yml > ./build/docker-compose.yml
### Copying workbench_labs utility files
cp ./workbench_labs_files/workbench_labs ./build
cp ./workbench_labs_files/envConfig.sh ./build
cp ./workbench_labs_files/makeEnv.sh ./build
cp ./workbench_labs_files/makeEnvConfig.sh ./build
cp ./workbench_labs_files/makeNginxConf.sh ./build
### Packaging everything
echo ""
echo "*** Packaging everything ***"
echo ""
cd ./build
tar cvf solutionsWorkbenchLabs.tar *
cd ..
echo "*** Done ***"
