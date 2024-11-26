import React from "react";
import { render, unmountComponentAtNode } from "react-dom";
import { act } from "react-dom/test-utils";

import DataModel from '../../../../dataModel/dataModel';
import { setLicensedFeatures, FEATURES } from '../../../../common/LicensedFeatures';

import { PropertyDefinition } from './PropertyDefinition';

let container = null;
beforeEach(() => {
  // setup a DOM element as a render target
  setLicensedFeatures([FEATURES.MODEL.PropertyConstraints])
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  // cleanup on exiting
  unmountComponentAtNode(container);
  container.remove();
  container = null;
});

it("renders property definition", () => {
  var dataModel = DataModel();
  act(() => {
    var propertyDefinition = {
        key: '123',
        name: 'myProperty',
        datatype: dataModel.DataTypes.String,
        referenceData: 'myRefData',
        isPartOfKey: true
    }
    render(<PropertyDefinition key={'123'}
        index={1} dataModel={dataModel}
        propertyDefinition={propertyDefinition} parentClassType={'NodeLabel'}
        savePropertyDefinition={() => {}}
        removePropertyDefinition={() => {}}/>, container);
  });
  expect(container.querySelector("#name").value).toBe("myProperty");
  expect(container.querySelector("input[name='datatype']").value).toBe(dataModel.DataTypes.String);
  expect(container.querySelector("#referenceData").value).toBe("myRefData");
  expect(container.querySelector("input[value='isPartOfKey']").checked).toBe(true);
});
