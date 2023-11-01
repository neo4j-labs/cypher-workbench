import { Node } from 'slate';
import DataTypes from '../../../../dataModel/DataTypes';

export class DashboardCardDataProvider {

    constructor (properties) {
        properties = (properties) ? properties : {};

        var {
            dashboardCardTitle,
            dashboardCardBlockDataProvider,
            dashboardCardBlockKey,
            dashboardCardBuilder,
            graphNode,
        } = properties;

        this.graphNode = graphNode;
        this.dashboardCardBlockDataProvider = dashboardCardBlockDataProvider;
        this.dashboardCardBlockKey = dashboardCardBlockKey;
        this.dashboardCardBuilder = dashboardCardBuilder;
        this.dashboardCardTitle = (dashboardCardTitle) ? dashboardCardTitle : 'Dashboard Card';

        this.loadDataIfPresent();
    }

    data = () => this.dashboardCardBlockDataProvider.data();

    getDataModel = () => this.dashboardCardBlockDataProvider.getDataModel();

    setTitle = (dashboardCardTitle, ignoreSave) => {
      this.dashboardCardTitle = dashboardCardTitle;
      if (!ignoreSave) {
          this.graphNode.addOrUpdateProperty("dashboardCardTitle", dashboardCardTitle, DataTypes.String);
      }
    }

    getTitle = () => this.dashboardCardTitle;

    loadDataIfPresent = () => {
        const title = this.graphNode.getPropertyValueByKey("dashboardCardTitle", "Dashboard Card");
        this.setTitle(title);
    }
    
}