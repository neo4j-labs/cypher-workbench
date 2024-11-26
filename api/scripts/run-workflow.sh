#!/bin/bash
# https://stedolan.github.io/jq/
if [[ "$#" -lt 2 ]] ; then
    echo "Usage: ./run-workflow <filename.json> <user email> [protocol] [host] [port]"
    exit 2
fi 
if [[ -f "$1" ]] ; then
    echo "Found mapping data file, $1"
else 
    echo "Unable to find mapping data file, $1"
    exit 2
fi
USER=$2
PROTOCOL=http
if [[ -n "$3" ]] ; then PROTOCOL=$3; fi
HOST=localhost
if [[ -n "$4" ]] ; then HOST=$4; fi
PORT=4000
if [[ -n "$5" ]] ; then PORT=$5; fi
# can use python to validate that file has json contents 
# python -mjson.tool "$1" 
# read contents of file and then format for json-string param in query
RAWMAP=$(<$1)
CLEANMAP=$(echo "$RAWMAP" | sed 's/"/\\\\\\"/g')
# build query for graphql
SERVICEID="bigquery-neo4j-incremental"
RWFMUTATION='{"query":"mutation RunWorkFlow{\n  runWorkflow(serviceId:\"'"$SERVICEID"'\", \n mappingData: \"'"$CLEANMAP"'\")}"}'
echo "Running Workflow"
curl "$PROTOCOL://$HOST:$PORT/graphql" \
-H 'Accept-Encoding: gzip, deflate, br' \
-H 'Content-Type: application/json' \
-H 'Accept: application/json' \
-H 'Connection: keep-alive' \
-H 'DNT: 1' -H "Origin: $PROTOCOL://$HOST:$PORT" \
-H "authorization: Bearer $USER" \
--data-binary "$RWFMUTATION" \
--compressed