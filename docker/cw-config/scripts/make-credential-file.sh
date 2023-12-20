#!/bin/bash
if [[ "$#" -lt 3 ]] ; then
	echo "Usage: ./make_credential_file <username> <password> <credential_output_file.txt>"
	exit 2
fi 
CREDENTIALS=$1:$2
ENCODED_CREDENTIALS=$(echo -n $CREDENTIALS | base64)
echo $ENCODED_CREDENTIALS > $3
cat $3
