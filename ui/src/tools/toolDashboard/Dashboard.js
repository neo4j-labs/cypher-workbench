import React, { Component } from 'react';
import _ from "lodash";
import { Button, Drawer, Tabs, Tab, Typography, Tooltip } from "@material-ui/core";

import { ALERT_TYPES, USER_ROLE, COLORS } from "../../common/Constants";
import { isFeatureLicensed, FEATURES } from '../../common/LicensedFeatures';
import GeneralDialog from "../../components/common/GeneralDialog";

import {
    GraphDocChangeType,
    GraphViewChangeType,
  } from "../../dataModel/graphDataConstants";

import { NETWORK_STATUS } from '../../persistence/graphql/GraphQLPersistence';
import { DashboardDataProvider } from "./components/dataProvider/dashboardDataProvider";

import DashboardCard from './components/common/DashboardCard';
import { rectanglesIntersectOkToTouch } from '../../components/canvas/d3/helpers';

import { CommunicationHelper } from "../common/communicationHelper";
import { PersistenceHelper } from "../common/persistenceHelper";

import { stopListeningTo, listenTo } from "../../dataModel/eventEmitter";


import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { Responsive, WidthProvider } from "react-grid-layout";
const ResponsiveReactGridLayout = WidthProvider(Responsive);

const Sizes = {
    TitleBarHeight: "40px",
    BottomTitleBarHeight: "40px",
    DefaultBottomDrawerHeight: "250px",
    MaxBottomDrawerHeight: "650px",
    MinBottomDrawerHeight: "150px",
    BottomDrawerHeightIncrement: "100px",
    RightTop: "63px",
    RightTitleBarWidth: "30px",
    FloatingBarRightMargin: "120px",
    DefaultRightDrawerWidth: "300px",
    MaxRightDrawerWidth: "1200px",
    MinRightDrawerWidth: "400px",
    RightDrawerWidthIncrement: "100px",
    MainAreaPadding: "8px",
    PageBottomPadding: 800,
  };
  
  const Drawers = {
    Bottom: "Bottom",
    Right: "Right",
  };

  const pxVal = (px) =>
    typeof px === "string" ? parseInt(px.replace(/px$/, "")) : px;
  

// Layout info from 
// https://github.com/STRML/react-grid-layout
//  -and-
// https://codesandbox.io/s/5wy3rz5z1x?file=/src/ShowcaseLayout.js:1649-1736
export default class Dashboard extends Component {

    defaultCardHeight = 4;
    defaultCardWidth = 2;
    numCols = 12;
    numCards = 5;

    GraphDocType = "Dashboard";

    id = "dashboard";

    dashboardDataProvider = new DashboardDataProvider({
        id: this.id,
        dashboardBuilder: this
      });

    getDataProvider = () => this.dashboardDataProvider;

    getNewDashboardDataProvider = (graphDocMetadata) => {
        if (this.dashboardDataProvider) {
            stopListeningTo(this.dashboardDataProvider, this.id);
        }
        var dashboardDataProvider = new DashboardDataProvider({
            id: graphDocMetadata.key,
            dashboardBuilder: this
        });
        listenTo(dashboardDataProvider, this.id, this.dataChangeListener);
        console.log("listenTo called on dashboardDataProvider");
        return dashboardDataProvider;
    };

    closeGeneralDialog = () => {
        this.setState({
          generalDialog: { ...this.state.generalDialog, open: false },
        });
      };
    
    showGeneralDialog = (title, description, buttons) => {
        var { generalDialog } = this.state;
        this.setState({
          generalDialog: {
            ...generalDialog,
            open: true,
            title: title,
            description: description,
            buttons: buttons,
          },
        });
      };

    state = {
        currentBreakpoint: "lg",
        compactType: "vertical",
        rightDrawerOpen: false,
        rightDrawerOpenWidth: Sizes.DefaultRightDrawerWidth,
        mounted: false,
        internalLayouts: [],
        layouts: { lg: [] },
        generalDialog: {
            open: false,
            handleClose: this.closeGeneralDialog,
            title: "",
            description: "",
            buttons: [],
          },
      };        

    constructor (props) {
        super(props);
        props.setSureRef(this);

        this.persistenceHelper = new PersistenceHelper({
            graphDocContainer: this,
            getNetworkStatus: this.props.getNetworkStatus,
            LOCAL_STORAGE_KEY: this.dashboardDataProvider.getLocalStorageKey(),
            REMOTE_GRAPH_DOC_TYPE: this.dashboardDataProvider.getRemoteGraphDocType(),
            SUBGRAPH_MODEL: this.dashboardDataProvider.getSubgraphModel(),
          });
      
        this.communicationHelper = new CommunicationHelper({
            graphDocContainer: this,
            persistenceHelper: this.persistenceHelper,
            getNetworkStatus: this.props.getNetworkStatus,
            setNetworkStatus: this.props.setNetworkStatus,
            setStatus: this.setStatus,
            showDialog: this.showGeneralDialog,
            GraphDocType: this.dashboardDataProvider.getRemoteGraphDocType(),
          });
    }

    onBreakpointChange(breakpoint) {
        /*
        this.setState({
          currentBreakpoint: breakpoint
        });
        */
      }    

    componentDidMount = () => {
        /*
        const layout = this.getLayout();
        console.log('layout: ', layout);
        this.setState({
            layout: layout
        });
        */
        var cards = this.getCards();
        this.setState({
            cards: cards
        });
        //console.log('this.props.initialLayout: ', this.props.initialLayout);
    }

    tabDeactivated = () => {
        this.setState({
            isActive: false
        })
    }

    tryToGoOnline = () => this.communicationHelper.tryToGoOnline();

    isOnline = () => {
        if (this.props.getNetworkStatus() === NETWORK_STATUS.ONLINE 
            || this.props.getNetworkStatus() === NETWORK_STATUS.SAVING
            || this.props.getNetworkStatus() === NETWORK_STATUS.SAVED) {
            return true;
        } else {
            alert('Operation only permitted when online.', ALERT_TYPES.WARNING);
            return false;
        }
    }

    getMenus = () => {
        var menus = [];
        var fileMenuItems = [];
        if (isFeatureLicensed(FEATURES.DASHBOARD.New)) {
            fileMenuItems.push({id: 'new', text: 'New Dashboard'});
        }
        if (fileMenuItems.length > 0) {
            var fileMenu = {
                id: 'dashboard-file',
                text: 'File',
                handler: (menu, menuItem) => {
                    switch (menuItem.id) {
                        case 'new':
                            alert('TODO');
                            break;
                        default:
                            break;
                    }
                },
                menuItems: fileMenuItems
            }
            menus.push(fileMenu);
        }
        return menus;
    }

    tabActivated = () => {
        const { setTitle, setMenus } = this.props;
        setTitle("Dashboard");
        setMenus(this.getMenus());
        this.setState({
            isActive: true
        })
    }

    getNextOpenPosition = (width, height) => {
        var { internalLayouts } = this.state;

        for (var y = 0; y < 1000; y += this.defaultCardHeight) {
            for (var x = 0; x <= (this.numCols - width); x++) {
                var anyIntersect = internalLayouts.find(l => rectanglesIntersectOkToTouch(
                    x, y, x + width, y + height,
                    l.x, l.y, l.x + l.w, l.y + l.h
                ));
                if (!anyIntersect) {
                    return { x, y };
                }
            }
        }
        // default
        return { x: 0, y: 0};
    }

    getCards = () => {
        var cards = [];

        var { internalLayouts } = this.state;

        for (var i = 0; i < this.numCards; i++) {
            var openPosition = this.getNextOpenPosition(this.defaultCardWidth, this.defaultCardHeight);
            internalLayouts.push({
                x: openPosition.x,
                y: openPosition.y,
                w: this.defaultCardWidth,
                h: this.defaultCardHeight
            });

            cards.push(
                <div key={i} data-grid={{x: openPosition.x, y: openPosition.y, w: this.defaultCardWidth, h: this.defaultCardHeight}}
                    style={{border: '2px solid lightgray', background: 'white'}}
                >
                    <DashboardCard
                        blockKey={`card${i}`}
                        domId={`card${i}`}
                        title={`Metric ${i}`}
                    >
                        <span style={{fontSize: 64}}>{i}</span>                
                    </DashboardCard>
                </div>
            )
            //cards.push(<div key={`card${i}`} style={{border: '1px solid darkgray'}}>{`Metric ${i}`}</div>);
        }

        this.setState({
            internalLayouts: internalLayouts.slice()
        });

        return cards;
    }

    onLayoutChange = (layout, layouts) => {
        //this.props.onLayoutChange(layout, layouts);
    }

    viewChanged = (changeType) =>
        this.dataChangeListener("viewChanged", changeType, {});

    dataChangeListener = (id, messageName, messagePayload) => {
        //console.log('data change');
        //console.log(id, messageName, messagePayload);
        /*
            try {
                throw new Error('printing stack trace');
            } catch (e) {
                console.log(e);
            }
            */
        if (this.state) {
        // clearing this timer because dataChangeTimer will pick up any relevant changes
            this.persistenceHelper.clearRetryTimer();
            if (this.dataChangeTimer) {
                clearTimeout(this.dataChangeTimer);
        }

        this.setStatus("", false);
        this.communicationHelper.setNetworkStatus(NETWORK_STATUS.UNSAVED); 
        this.dataChangeTimer = setTimeout(() => {
            this.dataChangeTimer = null;
            //console.log('saving data');
            var { loadedMetadata } = this.state;

            if (loadedMetadata) {
            const networkStatus = this.props.getNetworkStatus();
            const validNetworkStatuses = [
                NETWORK_STATUS.ONLINE,
                NETWORK_STATUS.NETWORK_RETRY,
                NETWORK_STATUS.UNSAVED,
                NETWORK_STATUS.SAVING,
                NETWORK_STATUS.SAVED,
            ];
            var graphDocMetadata = {
                ...loadedMetadata,
                dateUpdated: new Date().getTime().toString(),
                viewSettings: {
                dashboardViewSettings: this.getCypherSuiteViewSettings(),
                //canvasViewSettings: this.getGraphCanvas().getViewSettings(),
                //dataModelViewSettings: this.getDataModelCanvas().getViewSettings(),
                },
            };
            if (validNetworkStatuses.includes(networkStatus)) {
                console.log("changeListener: online: calling saveChanges");
                this.saveChanges(
                    messageName,
                    messagePayload,
                    graphDocMetadata,
                    this.dashboardDataProvider
                );
            } else {
                console.log(
                "changeListener: online: calling saveGraphDocChangesLocally"
                );
                this.setStatus("Offline. Saved changes locally.", false);
                this.persistenceHelper.saveChangesLocally(
                    messageName, 
                    messagePayload, 
                    graphDocMetadata, 
                    this.dashboardDataProvider
                );
            }
            }
        }, 2000);
        }
    };

    setStatus = (message, active) => {
        message = typeof message === "string" ? message : "" + message;
        //console.log("status: " + message);
        const { status, activityIndicator } = this.state;
        if (message !== status || active !== activityIndicator) {
          this.setState({
            status: message,
            activityIndicator: active,
          });
        }
      };

    getDashboardViewSettings = () => {
        const {
          rightDrawerOpen,
          rightDrawerOpenWidth,
        } = this.state;
    
        var settings = {
          rightDrawerOpen,
          rightDrawerOpenWidth,
        };
        return settings;
      };
    
      handleDashboardViewSettings = (dashboardViewSettings) => {
        dashboardViewSettings = dashboardViewSettings || {};
        var {
          rightDrawerOpen,
          rightDrawerOpenWidth,
        } = dashboardViewSettings;
    
        rightDrawerOpen = rightDrawerOpen !== undefined ? rightDrawerOpen : false;
    
        rightDrawerOpenWidth =
          rightDrawerOpenWidth !== undefined
            ? rightDrawerOpenWidth
            : Sizes.DefaultRightDrawerWidth;
    
        var updateStateObject = {
          rightDrawerOpen,
          rightDrawerOpenWidth,
        };
    
        this.setState(updateStateObject);
      };

      drawerDrag = {
        resizing: false,
        drawer: null,
        initialX: 0,
        initialY: 0,
        currentX: 0,
        currentY: 0,
        time: null,
      };
    
      drawerMouseDown = (drawer) => (e) => {
        const { bottomDrawerOpen, rightDrawerOpen } = this.state;
        if (
          (drawer === Drawers.Bottom && bottomDrawerOpen) ||
          (drawer === Drawers.Right && rightDrawerOpen)
        ) {
          this.drawerDrag = {
            resizing: true,
            drawer: drawer,
            initialX: e.pageX,
            initialY: e.pageY,
            currentX: e.pageX,
            currentY: e.pageY,
            time: new Date().getTime(),
          };
        }
      };
    
      drawerMouseMove = (e) => {
        if (this.drawerDrag.resizing) {
          const { drawer, currentX, currentY } = this.drawerDrag;
          if (drawer === Drawers.Bottom) {
            const { bottomDrawerOpenHeight } = this.state;
            var increase = currentY - e.pageY;
            var newHeight = pxVal(bottomDrawerOpenHeight) + increase;
            newHeight =
              newHeight > pxVal(Sizes.MaxBottomDrawerHeight)
                ? pxVal(Sizes.MaxBottomDrawerHeight)
                : newHeight;
            newHeight =
              newHeight < pxVal(Sizes.MinBottomDrawerHeight)
                ? pxVal(Sizes.MinBottomDrawerHeight)
                : newHeight;
            this.setState(
              {
                bottomDrawerOpenHeight: `${newHeight}px`,
              },
              () => {
                this.setBottomTableHeight();            
                this.viewChanged(GraphDocChangeType.PanelResize);
              }
            );
            this.drawerDrag.currentY = e.pageY;
          } else if (drawer === Drawers.Right) {
            const { rightDrawerOpenWidth } = this.state;
            var increase = currentX - e.pageX;
            var newWidth = pxVal(rightDrawerOpenWidth) + increase;
            newWidth =
              newWidth > pxVal(Sizes.MaxRightDrawerWidth)
                ? pxVal(Sizes.MaxRightDrawerWidth)
                : newWidth;
            newWidth =
              newWidth < pxVal(Sizes.MinRightDrawerWidth)
                ? pxVal(Sizes.MinRightDrawerWidth)
                : newWidth;
            this.setState(
              {
                rightDrawerOpenWidth: `${newWidth}px`,
              },
              () => {
                this.setDataModelCanvasSize();
                this.viewChanged(GraphDocChangeType.PanelResize);
              }
            );
            this.drawerDrag.currentX = e.pageX;
          }
        }
      };
    
    toggleRightDrawer = () => {
        const { rightDrawerOpen } = this.state;
        var open = !rightDrawerOpen;
        this.setState(
            {
            rightDrawerOpen: open,
            },
            () => {
            this.viewChanged(
                open ? GraphDocChangeType.PanelOpen : GraphDocChangeType.PanelClose
            );
            }
        );
      };

    getRightDrawerWidth = () => {
        const { rightDrawerOpen, rightDrawerOpenWidth } = this.state;
        return rightDrawerOpen ? rightDrawerOpenWidth : Sizes.RightTitleBarWidth;
      };

    render() {

        const { cards, layouts, mounted, compactType, 
            rightDrawerOpen, generalDialog } = this.state;

        return (
            <div>
                <ResponsiveReactGridLayout style={{background: 'darkgray', minHeight: '800px'}}
                    {...this.props}
                        layouts={layouts}
                        onBreakpointChange={this.onBreakpointChange}
                        onLayoutChange={this.onLayoutChange}
                        // WidthProvider option
                        measureBeforeMount={false}
                        // I like to have it animate on mount. If you don't, delete `useCSSTransforms` (it's default `true`)
                        // and set `measureBeforeMount={true}`.
                        useCSSTransforms={mounted}
                        compactType={compactType}
                        preventCollision={!compactType}
                    >
                    {cards}            
                </ResponsiveReactGridLayout>
                <Drawer
                    variant="permanent"
                    anchor="right"
                    onClose={() => {}}
                    PaperProps={{
                        style: {
                        position: "absolute",
                        top: Sizes.RightTop,
                        border: "1px #C6C6C6 solid",
                        },
                    }}
                    >
                    <div
                        className="box"
                        style={{
                        display: "flex",
                        flexFlow: "row",
                        width: this.getRightDrawerWidth(),
                        height: "100%",
                        }}
                    >
                        <div
                        onMouseDown={this.drawerMouseDown(Drawers.Right)}
                        onClick={this.conditionalToggleRightDrawer}
                        onDoubleClick={this.toggleRightDrawer}
                        style={{
                            display: "flex",
                            flexFlow: "column",
                            cursor: "pointer",
                            width: Sizes.RightTitleBarWidth,
                            color: COLORS.toolBarFontColor,
                            backgroundColor: COLORS.secondaryToolBarColor,
                          }}
                        >
                        <div
                            onClick={this.toggleRightDrawer}
                            style={{
                            cursor: "pointer",
                            fontSize: "1.7em",
                            marginLeft: ".3em",
                            }}
                        >
                            <span
                            className={`fa ${
                                rightDrawerOpen ? "fa-caret-right" : "fa-caret-left"
                            }`}
                            style={{ marginRight: "1.5em" }}
                            />
                        </div>
                        <Typography
                            style={{
                            padding: "3px",
                            writingMode: "vertical-lr",
                            transform: "rotate(-180deg)",
                            }}
                        >
                            Future
                        </Typography>
                        <div style={{ flexGrow: 1 }} />
                        </div>
                        <div style={{ padding: "10px" }}>
                        </div>
                    </div>
                </Drawer>
                <GeneralDialog
                    open={generalDialog.open}
                    onClose={generalDialog.handleClose}
                    title={generalDialog.title}
                    description={generalDialog.description}
                    buttons={generalDialog.buttons}
                />

            </div>
        )
        /*
        return (
          <div className="dashboardWrapper" 
                        style={{background: 'darkgray', 
                        padding: '5px', 
                        height: '800px', 
                        overflowY: 'scroll'
                    }}
          >
            {
                this.getCards()
            }
          </div>
      )
      */
    }

}

Dashboard.defaultProps = {
    className: "layout",
    rowHeight: 50,
    onLayoutChange: function() {},
    cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }
};