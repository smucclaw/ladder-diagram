/**
 * Represents a truth value
 * - null: unknown
 * - 'T': True
 * - 'F': False
 * @typedef {(null | 'T' | 'F')} TruthValue
 */

/**
 * Represents a boolean equation/circuit consisting
 * of OR and AND
 * @typedef {(BoolVar | AllQuantifier | AnyQuantifier)} Circuit
 */

/** Represents a boolean variable */
class BoolVar {
    /**
     * Constructor
     * Truth values can be
     * - null: unknown
     * - 'T': True
     * - 'F': False
     * @param {String} text - Name of boolean variable
     * @param {Boolean} isnegated - If the variable is negated
     * @param {TruthValue} [preset=null] - Default value of the variable
     * @param {TruthValue} [known=null] - Known value of the variable
     */
    constructor(text, isnegated, preset = null, known = null) {
        this.text = text
        this.isnegated = isnegated
        this.preset = preset
        this.known = known
    }
}

/** 
 * Represents an ALL quantifier
 */
class AllQuantifier {
    /**
     * Constructor
     * This quantifier asserts it is True iff 
     * all its children is True.
     * This is an abstraction of the AND operator
     * @param {Circuit[]} children - Array of Circuit objects
     * @param {String} [header="all of"] - Optional label of quantifier 
     */
    constructor(children, header = "all of") {
        this.children = children
        this.header = header
    }
}

/** 
 * Represents an ANY quantifier
 */
class AnyQuantifier {
    /**
     * Constructor
     * This quantifier asserts it is True iff 
     * at least one its children is True.
     * This is an abstraction of the OR operator
     * @param {Circuit[]} children - Array of Circuit objects
     * @param {String} [header="either"] - Optional label of quantifier 
     */
    constructor(children, header = "either") {
        this.children = children
        this.header = header
    }
}

export {
    BoolVar,
    AllQuantifier,
    AnyQuantifier
}