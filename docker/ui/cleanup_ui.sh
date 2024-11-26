#!/bin/sh
if [ "$1" = "-skipNpmInstall" ]
then
    mkdir ./keep
    mv ./ui/node_modules ./keep
    find ./ui -exec rm -rdf "{}" \;
else
    find ./ui -exec rm -rdf "{}" \;
fi
