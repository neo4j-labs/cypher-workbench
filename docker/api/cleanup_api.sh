#!/bin/sh
if [ "$1" = "-skipNpmInstall" ]
then
    mkdir ./keep
    mv ./api/node_modules ./keep
    find ./api -exec rm -rdf "{}" \;
else
    find ./api -exec rm -rdf "{}" \;
fi
