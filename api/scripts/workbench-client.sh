#!/bin/bash
# https://stedolan.github.io/jq/

if [[ "$#" -lt 3 ]] ; then
	echo "Usage: ./workbench_client <mapping_filename.json> <credentials.txt> <operationtype (one of: bigquerytoneo|neotobigquery|neotoneo)> [protocol] [host] [port]"
	exit 2
fi 

if [[ -f ./"$1" ]] ; then
	echo "Found mapping data file: $1"
else 
	echo "Unable to find mapping data file, $1"
	exit 2
fi

if [[ ! -f ./"$2" ]] ; then 
	echo "Unable to find credentials: $2"
	exit 2
fi

PROTOCOL=http
if [[ -n "$4" ]] ; then PROTOCOL=$4; fi

HOST=localhost
if [[ -n "$5" ]] ; then HOST=$5; fi

PORT=4000
if [[ -n "$6" ]] ; then PORT=$6; fi


# read contents of file and then format for json-string param in query
RAWMAP=$(<$1)
#CLEANMAP=$(echo "$RAWMAP" | sed 's/"/\\\\\\"/g')
CLEANMAP=$(echo "$RAWMAP" | sed 's/"/\\"/g')
CLEANMAP=$(echo "$CLEANMAP" | sed 's/\\\\"/\\\\\\"/g')
CLEANMAP=$(echo "$CLEANMAP" | tr '\n' ' ')
#CLEANMAP=$(echo "$CLEANMAP" | tr '\t' ' ')
#echo $CLEANMAP

# build query for graphql

SECONDS=$(date +%s)
TEMP_FILE="workbench_payload_$SECONDS.json"
echo "Creating $TEMP_FILE file"
cat /dev/null > $TEMP_FILE

case "$3" in 
	"bigquerytoneo") 
	#RWFMUTATION='{"query":"mutation RunWorkFlow{ runWorkflow(serviceId:\"'"$BIGQUERY_TO_NEO4J_SERVICEID"'\", mappingData: \"'"$CLEANMAP"'\")}"}'
    MUTATION="RunWorkFlow{ runWorkflow"
    SERVICE_ID="bigquery-neo4j-incremental"    
    JSON_MAPPING_FIELDNAME="mappingData"
	;;
	"neotobigquery")
	#RWFMUTATION='{"query":"mutation RunNeo4jToBigQuery{ runNeo4jToBigQuery(serviceId:\"'"$NEO4J_TO_BIGQUERY_SERVICEID"'\", mappingData: \"'"$CLEANMAP"'\")}"}'
    MUTATION="RunNeo4jToBigQuery{ runNeo4jToBigQuery"
    SERVICE_ID="neo4j-to-bigquery"
    JSON_MAPPING_FIELDNAME="cypherStatement"
	;;
	"neotoneo")
	#RWFMUTATION='{"query":"mutation RunNeo4jToNeo4j{ runNeo4jToNeo4j(serviceId:\"'"$NEO4J_TO_NEO4J_SERVICEID"'\", mappingData: \"'"$CLEANMAP"'\")}"}'
    MUTATION="RunNeo4jToNeo4j{ runNeo4jToNeo4j"    
    SERVICE_ID="neo4j-to-neo4j"
    JSON_MAPPING_FIELDNAME="neoMapping"
	;;
	*)
	echo "Invalid operation type: $3. Valid operations include: \"bigquerytoneo\", \"neotobigquery\", \"neotoneo\"."
	exit 2
	;;
esac

echo -n '{"query":"mutation '$MUTATION'(serviceId:\"'$SERVICE_ID >> $TEMP_FILE
echo -n '\", '$JSON_MAPPING_FIELDNAME': \"\"\"' >> $TEMP_FILE
echo -n $CLEANMAP >> $TEMP_FILE
echo -n '\"\"\")}"}' >> $TEMP_FILE

echo "Running Workflow"

TYPE='"type": "Basic"'
CREDENTIALS='"credentials": "'$(<$2)'"'
CREDENTIALS_JSON="{ $TYPE, $CREDENTIALS}"

curl "$PROTOCOL://$HOST:$PORT/graphql" \
-H 'Accept-Encoding: gzip, deflate, br' \
-H 'Content-Type: application/json' \
-H 'Accept: application/json' \
-H 'Connection: keep-alive' \
-H 'DNT: 1' -H 'Origin: http://localhost:4000' \
-H "authorization: $CREDENTIALS_JSON" \
-d @$TEMP_FILE

