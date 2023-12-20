PRIMARY_ORGANIZATION=$2
USERID=$3
PASSWORD=$4
NAME=$5
PICTURE=$6
echo "Creating $USERID"
if [ "$#" -lt 5 ];
then
  echo 'Usage: ./create-user.sh <credentials.txt> <primaryOrganization> <email> <password> <name> [picture] [host] [graphql port] [https]'
  exit 1
fi 

HOST=localhost
if [[ -n "$7" ]]; then HOST=$7; fi

#PORT=37400
PORT=80
if [[ -n "$8" ]]; then PORT=$8; fi

PROTOCOL=http
if [[ -n "$9" ]]; then PROTOCOL=$9; fi

TYPE='"type": "Basic"'
CREDENTIALS='"credentials": "'$(<$1)'"'
CREDENTIALS_JSON="{ $TYPE, $CREDENTIALS}"
#echo $CREDENTIALS_JSON

curl "$PROTOCOL://$HOST:$PORT/graphql" \
-H 'content-type: application/json' \
-H "authorization: $CREDENTIALS_JSON" \
--data '{"query":"mutation {\n  createUserSignUp(input: {primaryOrganization: \"'"$PRIMARY_ORGANIZATION"'\", email: \"'"$USERID"'\", password: \"'"$PASSWORD"'\", name: \"'"$NAME"'\", picture: \"'"$PICTURE"'\"}) {\n    email\n    name\n    picture\n  }\n}\n"}' \
--compressed
