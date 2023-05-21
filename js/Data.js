/**
 * Represents a truth value
 * 
 * - 'T': True
 * 
 * - 'F': False
 * 
 * - 'U': unknown (user may have clicked "don't know")
 * 
 * - null : user hasn't clicked on anything
 * 
 * @typedef {(null | 'U' | | 'T' | 'F')} TruthValue
 */

/**
 * Represents a boolean equation/circuit consisting
 * of OR and AND
 * @typedef {(BoolVar | AllQuantifier | AnyQuantifier)} Circuit
 */

/** Represents a boolean variable */
class BoolVar {
    /**
     * Constructs a BoolVar
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
 * Represents an ALL quantifier. 
 * This quantifier asserts it is True iff 
 * all its children is True.
 * This is an abstraction of the AND operator.
 */
class AllQuantifier {
    /**
     * Constructs an AllQuantifier
     * @param {Circuit[]} children - Array of Circuit objects
     * @param {String} [header="all of"] - Optional label of quantifier 
     */
    constructor(children, header) {
      this.children = children
      this.header =
        header !== undefined ? header :
        this.children.length <= 1 ? null :
        this.children.length == 2 ? "both" : "all of"
    }
}

/** 
 * Represents an ANY quantifier. 
 * This quantifier asserts it is True iff 
 * at least one its children is True. 
 * This is an abstraction of the OR operator
 */
class AnyQuantifier {
    /**
     * Constructs an AnyQuantifier
     * @param {Circuit[]} children - Array of Circuit objects
     * @param {String} [header="either"] - Optional label of quantifier 
     */
    constructor(children, header) {
      this.children = children
      this.header =
        header !== undefined      ? header :
        this.children.length <= 1 ? null :
        this.children.length == 2 ? "either" : "any of"
    }
}

export {
    BoolVar,
    AllQuantifier,
    AnyQuantifier
}
