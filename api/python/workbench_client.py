import requests
import base64
import json
import pprint

class WorkbenchClient:

    def __init__(self, protocol="http", host="localhost", port="4000", auth_type="Basic"):
        """
        params:
            auth_type: String - authorization scheme (Basic, SWToken)
            protocol, host, port: Strings (default "https://localhost:4000")
        return: 
            void
            displays response code and data from post request
        """
        self.auth_type = auth_type
        self.protocol = protocol
        self.host = host
        self.port = port 

    def bigquery_to_neo4j(self, mapping_filename, username="", password="", credentials="", swtoken= ""):
        """
        Runs a bigquery to neo4j workflow in the DS Workbench
        
        params:
            mapping_filename: String - name of json file specifying mapping 
            credentials: String - base64 encoded username:password
            swtoken: String - auth token from ds workbench
        return: 
            void
            displays response code and data from post request
        """

        serviceId="bigquery-neo4j-incremental"
        
        # get the mapping data from the file specified
        mapping_json = get_mapping(mapping_filename)

        # build query from mapping data and serviceId
        query = "mutation RunWorkFlow{ runWorkflow(serviceId:\"" \
                  + serviceId +  "\", mappingData: \"\"\"" + mapping_json + "\"\"\")}"

        response = self._post_request(query, username, password, credentials, swtoken)

        return response

    def neo4j_to_bigquery(self, mapping_filename, username="", password="", credentials="", swtoken= ""):
        """
        Runs a neo4j to bigquery workflow in the DS Workbench
        
        params:
            mapping_filename: String - name of json file specifying mapping 
            credentials: String - base64 encoded username:password
            swtoken: String - auth token from ds workbench
        return: 
            void
            displays response code and data from post request
        """
        
        serviceId="neo4j-to-bigquery"
        
        # get the mapping data from the file specified
        mapping_json = get_mapping(mapping_filename)

        # build query from cypher json and service id
        query = "mutation RunNeo4jToBigQuery{ runNeo4jToBigQuery(serviceId:\"" \
                  + serviceId +  "\", cypherStatement: \"\"\"" + mapping_json + "\"\"\")}"

        
        response = self._post_request(query, username, password, credentials, swtoken)

        return response

    def neo4j_to_neo4j(self, mapping_filename, username="", password="", credentials="", swtoken= ""):
        """
        Runs a neo4j to neo4j workflow in the DS Workbench
        
        params:
            mapping_filename: String - name of json file specifying mapping 
            credentials: String - base64 encoded username:password
            swtoken: String - auth token from ds workbench
        return: 
            void
            displays response code and data from post request
        """
        
        serviceId="neo4j-to-neo4j"
        
        # get the mapping data from the file specified
        mapping_json = get_mapping(mapping_filename)

        # build query from mapping data and service id
        query = "mutation RunNeo4jToNeo4j{ runNeo4jToNeo4j(serviceId:\"" \
                  + serviceId +  "\", neoMapping: \"\"\"" + mapping_json + "\"\"\")}"
        
        response = self._post_request(query, username, password, credentials, swtoken)

        return response

    def _construct_auth_string(self, username, password, credentials, swtoken):
        
        if (username and password):
            credentials = username + ':' + password
            message_bytes = credentials.encode('ascii')
            base64_bytes = base64.b64encode(message_bytes)    
            credentials = base64_bytes.decode('ascii')
        
        auth_str = ""
        if credentials:
            auth_str = '{ "type": "' + self.auth_type + '", "credentials": "' + credentials + '"}'
        else: 
            auth_str = '{ "type": "' + self.auth_type + '", "credentials": "' + swtoken + '"}'
            
        return auth_str
        

    def _post_request(self, query, username, password, credentials, swtoken):
        # construct headers
        header = {'Content-Type': 'application/json'}

        response = ""
        auth = self._construct_auth_string(username, password, credentials, swtoken)
        header["authorization"] = auth
        # post request and display results
        response = requests.post(self.protocol + '://' + self.host + ':' + self.port + '/graphql', 
            json={'query':query}, headers=header)

        return response

def get_mapping(file_name):
    """
    retrieves json data from file and outputs json string
    """
    with open(file_name, 'r') as file:
        json_mapping = json.load(file)
        json_mapping = json.dumps(json_mapping)
    return json_mapping
