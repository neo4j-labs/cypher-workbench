#!/bin/bash
input="../ui/src/version.js"
while IFS= read -r line
do
  #echo "$line"
  result=`echo "$line" | sed "s/export const VERSION = '\([^ ]*\)';/\1/"`
  if [[ $line =~ (export const VERSION) ]]
  then
    VERSION=`tr '-' '_' <<< $result`
    VERSION=`tr '+' '_' <<< $VERSION`
  fi
done < "$input"
echo $VERSION
export WORKBENCH_VERSION=$VERSION
