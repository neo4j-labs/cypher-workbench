
export const ConstraintTypes = {
    RelationshipPropertyExistence: "RELATIONSHIP PROPERTY EXISTENCE",
    NodePropertyExistence: "NODE PROPERTY EXISTENCE",
    NodeKey: "NODE KEY",
    Uniqueness: "UNIQUENESS"
}

export const IndexTypes = {
    SinglePropertyIndex: "SinglePropertyIndex",
    CompositePropertyIndex: "CompositePropertyIndex"
}

export const getConstraintTypeKey = (desc) => Object.keys(ConstraintTypes).find(key => ConstraintTypes[key] === desc);

