import React from "react";
import { render, unmountComponentAtNode } from "react-dom";
import { act } from "react-dom/test-utils";

import DataModel from '../../../../dataModel/dataModel';
import { setLicensedFeatures, FEATURES } from '../../../../common/LicensedFeatures';

import PropertyDefinitions from './PropertyDefinitions';

let container = null;
beforeEach(() => {
  setLicensedFeatures([FEATURES.MODEL.PropertyConstraints])
  // setup a DOM element as a render target
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  // cleanup on exiting
  unmountComponentAtNode(container);
  container.remove();
  container = null;
});

it("renders nodeLabel properties", () => {
  var dataModel = DataModel();
  var propertyDefinitionsRef = React.createRef();
  var nodeLabel = new dataModel.NodeLabel({
      label: 'Test'
  });
  dataModel.addNodeLabel(nodeLabel);
  var propertyMap = {
    key: 'propKey', 
    name: 'myProperty', 
    datatype: dataModel.DataTypes.String, 
    referenceData: 'myRefData'  
  }
  nodeLabel.addOrUpdateProperty (propertyMap, { isPartOfKey: true });
  //console.log(nodeLabel);

  act(() => {
    var myNode = <PropertyDefinitions ref={propertyDefinitionsRef} dataModel={dataModel} propertyContainer={nodeLabel} />;
    render(myNode, container);
    propertyDefinitionsRef.current.setPropertyContainer(nodeLabel);
  });
  expect(container.querySelector("#name").value).toBe("myProperty");
  expect(container.querySelector("input[name='datatype']").value).toBe(dataModel.DataTypes.String);
  expect(container.querySelector("#referenceData").value).toBe("myRefData");
  expect(container.querySelector("input[value='isPartOfKey']").checked).toBe(true);
});
