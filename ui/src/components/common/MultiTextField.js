import React from 'react';
import Autocomplete from '@material-ui/lab/Autocomplete';
import {
    Button, Chip, CircularProgress, TextField
} from '@material-ui/core';

export default function MultiTextField (props) {
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
                if (response.success) {
                    setOptions(response.data);
                } else {
                    setOptions([response.error]);
                }
            })
        };
    }

    var setValue = (e) => {
        //console.log('id:' + e.target.id + ', value:' + e.target.value);
        if (dataChangeTimer) {
            clearTimeout(dataChangeTimer);
        }
        dataChangeTimer = setTimeout(searchFunction(e.target.value), 250);
    };

    return (
        <Autocomplete
            style={{width:'30em',float:'left'}}
            className={(props.className) ? props.className : ''}
            multiple
            id="tags-filled"
            options={options}
            getOptionLabel={x => x[props.displayProp]}
            loading={loading}
            value={props.value}
            onChange={(event, value) => props.setValue(value)}
            autoHighlight={true}
            freeSolo={typeof(props.freeSolo) === 'boolean' ? props.freeSolo : true}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip key={index} label={option[props.displayProp]} {...getTagProps({ index })} />
              ))
            }
            renderInput={params => (
              <TextField
                {...params}
                variant="standard"
                onChange={setValue}
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
    );
}
