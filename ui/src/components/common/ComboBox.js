import React from 'react';
import Autocomplete from '@material-ui/lab/Autocomplete';
import {
    Button, Chip, CircularProgress, TextField
} from '@material-ui/core';

export default function ComboBox (props) {
    //var tagList = ['Sports', 'Music', 'Movies'];
    var [loading, setLoading] = React.useState(false);
    var [options, setOptions] = React.useState([]);

    var dataChangeTimer = null;

    var searchFunction = function (searchText) {
        return function () {
            setLoading(true);
            //console.log('searchText: ' + searchText);
            props.search(searchText, (response) => {    // props.search: 'search' is a function passed in from the parent component
              //console.log(response);
              setLoading(false);
              //console.log('setOptions in ComboBox, ' + response.data);
              setOptions(response.data);
            }, (error) => {
              setLoading(false);
            });
        }
    }

    var setValue = (e) => {
        //console.log('id:' + e.target.id + ', value:' + e.target.value);
        if (dataChangeTimer) {
            clearTimeout(dataChangeTimer);
        }
        dataChangeTimer = setTimeout(searchFunction(e.target.value), 250);
    };
    //console.log("props.value, " + props.value);

    return (
          <Autocomplete
            id="combo-box-demo"
            options={options}
            freeSolo={props.freeSolo === true ? true : false}
            getOptionLabel={x => {
              var value = (typeof(x) === 'string')
                    ? x
                    : (x.getText) ?
                      x.getText()
                      : typeof(x[props.displayProp] === 'string') 
                        ? x[props.displayProp] 
                        : ''
              //console.log(`getOptionLabel for: '${x}' = '${value}'`);
              return value;
            }}
            style={props.style}
            loading={loading}
            value={props.value}
            onKeyPress={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                var value = event.target.value.replace(/[\n\r]+$/, '');
                props.setValue(value);
              } 
            }}
            clearOnBlur={(props.clearOnBlur !== undefined) ? props.clearOnBlur : true}
            onBlur={(event) => {
              console.log('combo box blur: ', event.target.value);
              props.setValue(event.target.value)
            }}
            onChange={(event, value) => {
              console.log('combo box onChange value: ', value)
              props.setValue(value)
            }}
            autoHighlight={true}
            renderInput={params => (
              <TextField
                {...params}
                variant="standard"
                onChange={setValue}
                onFocus={setValue}
                //autoComplete="off"
                autoComplete="chrome-off"
                label={props.label}
                placeholder=""
                fullWidth
                InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <React.Fragment>
                        {loading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </React.Fragment>
                    ),
                  }}
              />
            )}

          />
    )
}
