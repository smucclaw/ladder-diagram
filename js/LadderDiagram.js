import { BoolVar, AllQuantifier, AnyQuantifier } from "./Data.js"

/**
 * If `circuit` is BoolVar, TruthPath is a Boolean.
 * Otherwise, `circuit` is a AllQuantifier | AnyQuantifier,
 * and TruthPath is an array of TruthPaths that corresponds
 * to its children.
 * 
 * <br> E.g., ALL( ANY(A,B), C ). 
 * 
 * <br> Suppose A is false, B is true and C is true. 
 * Then TruthPath is [[false, true], true]
 * @typedef {(Boolean | TruthPath[])} TruthPath
 */

/** Represents the LadderDiagram generated from a boolean circuit */
class LadderDiagram {

    /**
     * Constructor
     * @param {HTMLElement} dom_parent -- parent element for dispatching events and getting em_size, but not mutated!
     * @param {Circuit} circuit - Circuit to generate diagram of
     * @param {("Corners" | "Sides")} [box_style="Corners"] - Select which box styling to use
     * @param {boolean} [_subgraph=false] - Internal use 
     */
    constructor(dom_parent, circuit, box_style="Corners", _subgraph = false) {
        this.em_size = parseFloat(getComputedStyle(dom_parent).fontSize)
        this.dom_parent = dom_parent

        if (circuit.type == 'BoolVar') {
            circuit = new AnyQuantifier(children = [circuit])
        }

        this.box_style = box_style
        this.graph_type = circuit.type
        this.is_subgraph = _subgraph

        this.dom_diagram = document.createElement("div")
        this.dom_diagram.classList.add(_subgraph ? "ladder-diagram-subgraph" : "ladder-diagram")

        if (circuit.header) {
            this.dom_header = document.createElement("div")
            this.dom_header.classList.add("ladder-diagram-header")
            this.dom_header.appendChild(document.createTextNode(circuit.header))
            this.dom_diagram.appendChild(this.dom_header)
        }

        this.dom_diagram_elements = document.createElement("div")
        this.dom_diagram_elements.classList.add("ladder-diagram-elements")
        this.dom_diagram.appendChild(this.dom_diagram_elements)

        this.dom_diagram_lines = document.createElement("canvas")
        this.dom_diagram_lines.classList.add("ladder-diagram-lines")
        this.dom_diagram.appendChild(this.dom_diagram_lines)

        this.circuit = circuit
        this._init_grid()

        this.ctx = this._init_drawing_ctx()
        this._init_lines()

        this._init_events()
    }

    _create_empty_cell(x, y) {
        let internal = document.createElement("div")
        internal.setAttribute("style", `grid-column:${1 + x};grid-row:${1 + y};`)
        this.dom_diagram_elements.appendChild(internal)
        return internal
    }

    _create_hidden_cell(x, y) {
        let internal = this._create_empty_cell(x, y)
        internal.classList.add("ladder-diagram-box-hidden")
        return internal
    }

    _create_text_cell(x, y, circuit) {

        let internal = this._create_empty_cell(x, y)
        let tags, prefix
        switch (this.box_style) {
            case "Corners": 
                tags = ["TL", "BL", "TR", "BR"]
                prefix = "corner"
                break
            case "Sides": 
                tags = ["Upper-True", "Upper-False", "Lower-False",
                        "Upper-Not", "Upper-NotTrue", "Lower-Not", 
                        "Lower-NotFalse", "Lower-NotTrue"]
                prefix = "half"
                break
            default:
                console.error(
                    "LadderDiagram._create_text_cell: Invalid this.box_style"
                    + "Expected: \"Corners\" | \"Sides\". Got "
                    + `${this.box_style}`)
        }
        for (const i of tags) {
            let corner = document.createElement("div")
            corner.classList.add(`ladder-diagram-box-${prefix}`)
            corner.classList.add(`ladder-diagram-box-${prefix}-${i}`)
            internal.appendChild(corner)
        }

        internal.appendChild(document.createTextNode(circuit.text))
        internal.classList.add("ladder-diagram-box")
        internal.classList.add("ladder-diagram-box-text")

        internal.classList.add(`ladder-diagram-box-${circuit.isnegated ? 'isnegated' : 'isnotnegated'}`)

        let truthval = null;
        if (circuit.known) {
            internal.classList.add("ladder-diagram-box-isknown")
            truthval = circuit.known
        }
        else {
            truthval = circuit.preset
        }
        switch (truthval) {
            case 'T': internal.classList.add("ladder-diagram-box-bool-T"); break
            case 'F': internal.classList.add("ladder-diagram-box-bool-F"); break
            case 'U': 
            case null: internal.classList.add("ladder-diagram-box-bool-U"); break
            default: console.error(
                "LadderDiagram._create_text_cell: Invalid bool tag in BoolVar"
                + "Expected: null | 'U' | 'T' | 'F'. Got "
                + `${truthval}`)
        }

        // when the user clicks the diagram, we want to cycle the values;
        // we inform the parent Vue component that a certain element has been clicked.
        // the LadderDiagram.vue component does the rest using a ladderEventHandler.
        let that = this
        internal.addEventListener("click", function(e) {
            // console.log(`textNode eventListener click on ${JSON.stringify(circuit, null, 2)} handling event ${JSON.stringify(e,null,2)}; and firing ladderEvent event against ${that.dom_parent}`)
            that.dom_parent.dispatchEvent(
                new CustomEvent("ladderEvent", {
                    bubbles: false,
                    cancelable: true,
                    detail: circuit.text // [TODO] replace this with circuit.id when we have that available.
                })
            );
        });
        
        return internal
    }

    _create_subgraph_cell(x, y, subcircuit) {
        let internal = this._create_empty_cell(x, y)
        internal.classList.add("ladder-diagram-box")
        internal.classList.add("ladder-diagram-box-subgraph")
        let subgraph = new LadderDiagram(this.dom_parent, subcircuit, this.box_style, true)
        internal.appendChild(subgraph.dom_diagram)
        return [internal, subgraph]
    }

    _init_grid() {
        switch (this.graph_type) {
            case "AllQuantifier":
                this.dom_nodes = []
                this.start_point = this._create_hidden_cell(0, 0)
                let nchild = this.circuit.children.length
                this.circuit.children.forEach((item, idx) => {
                    let dom_node, diagram_object
                    if (item.type == 'BoolVar') {
                        [dom_node, diagram_object] = [this._create_text_cell(1 + 2 * idx, 0, item), null]
                    }
                    else {
                        [dom_node, diagram_object] = this._create_subgraph_cell(1 + 2 * idx, 0, item)
                    }
                    let hidden_node = this._create_hidden_cell(2 + 2 * idx, 0)
                    this.dom_nodes.push([dom_node, diagram_object, hidden_node])
                })
                this.end_point = this._create_hidden_cell(2 * nchild, 0)
                break
            case "AnyQuantifier":
                this.dom_nodes = []
                this.start_point = this._create_hidden_cell(0, 0)
                this.circuit.children.forEach((item, idx) => {
                    let dom_node, diagram_object
                    if (item.type == 'BoolVar') {
                        [dom_node, diagram_object] = [this._create_text_cell(1, idx, item), null]
                    }
                    else {
                        [dom_node, diagram_object] = this._create_subgraph_cell(1, idx, item)
                    }
                    this.dom_nodes.push([dom_node, diagram_object])
                })
                this.end_point = this._create_hidden_cell(2, 0)
                break
            default:
                console.error(
                    "LadderDiagram._init_grid: Invalid circuit type. "
                    + "Expected AllQuantifier | AnyQuantifier. Got "
                    + `${this.graph_type}`)
        }
    }

    _init_drawing_ctx() {
        const bb = this.dom_diagram.getBoundingClientRect()
        const bbe = this.dom_diagram_elements.getBoundingClientRect()
        const canvas = this.dom_diagram_lines
        canvas.width = bbe.width
        canvas.height = bbe.height
        canvas.style.top = `${bbe.top - bb.top}px`
        canvas.style.left = `${bbe.left - bb.left}px`
        return canvas.getContext('2d');
    }

    _draw_line(pos1, pos2, color, linewidth) {
        this.ctx.strokeStyle = color
        this.ctx.lineCap = "round"
        this.ctx.lineWidth = linewidth;
        this.ctx.beginPath()
        this.ctx.moveTo(pos1[0], pos1[1])
        this.ctx.bezierCurveTo(
            .5 * pos1[0] + .5 * pos2[0], pos1[1],
            .5 * pos2[0] + .5 * pos1[0], pos2[1],
            pos2[0], pos2[1])
        this.ctx.stroke()
    }

    _dom_get_left(dom) {
        let diagbb = this.dom_diagram_lines.getBoundingClientRect()
        let bb = dom.getBoundingClientRect()
        return [bb.left - diagbb.left, bb.y + bb.height / 2 - diagbb.top]
    }

    _dom_get_right(dom) {
        let diagbb = this.dom_diagram_lines.getBoundingClientRect()
        let bb = dom.getBoundingClientRect()
        return [bb.right - diagbb.left, bb.y + bb.height / 2 - diagbb.top]
    }

    _dom_get_center(dom) {
        let diagbb = this.dom_diagram_lines.getBoundingClientRect()
        let bb = dom.getBoundingClientRect()
        return [bb.x + bb.width / 2 - diagbb.left, bb.y + bb.height / 2 - diagbb.top]
    }

    _draw_lines_allquantifier(color, linewidth) {
        this.dom_nodes.forEach((item, idx) => {
            let [dom_node, diagram_object, hidden_node] = item
            let prev_hidden = idx == 0 ? this.start_point : this.dom_nodes[idx - 1][2]
            let start_pos = this._dom_get_center(prev_hidden)
            let end_pos = this._dom_get_center(hidden_node)
            let node_left, node_right
            if (diagram_object) {
                node_left = this._dom_get_center(diagram_object.start_point)
                node_right = this._dom_get_center(diagram_object.end_point)
            }
            else {
                node_left = this._dom_get_left(dom_node)
                node_right = this._dom_get_right(dom_node)
            }
            this._draw_line(start_pos, node_left, color, linewidth)
            this._draw_line(end_pos, node_right, color, linewidth)
        })
    }

    _draw_lines_anyquantifier(color, linewidth) {
        let start_pos = this._dom_get_center(this.start_point)
        let end_pos = this._dom_get_center(this.end_point)
        this.dom_nodes.forEach(item => {
            let [dom_node, diagram_object] = item
            let node_left, node_right
            if (diagram_object) {
                node_left = this._dom_get_center(diagram_object.start_point)
                node_right = this._dom_get_center(diagram_object.end_point)
            }
            else {
                node_left = this._dom_get_left(dom_node)
                node_right = this._dom_get_right(dom_node)
            }
            this._draw_line(start_pos, node_left, color, linewidth)
            this._draw_line(end_pos, node_right, color, linewidth)
        })
    }

    _init_lines(color = "rgb(120,120,120)", linewidth = 0.05*this.em_size) {

        switch (this.graph_type) {
            case "AllQuantifier":
                this._draw_lines_allquantifier(color, linewidth)
                break
            case "AnyQuantifier":
                this._draw_lines_anyquantifier(color, linewidth)
                break
            default:
                console.error(
                    "LadderDiagram._init_lines: Invalid circuit type. "
                    + "Expected AllQuantifier | AnyQuantifier. Got "
                    + `${this.graph_type}`)
        }
        if (!this.is_subgraph) {
            this._draw_truth_path(this.get_truth_path())
        }
    }

    _draw_truth_path(truthpath, color = "black", linewidth = 0.15*this.em_size) {
        if (!truthpath) return
        switch (this.graph_type) {
            case "AllQuantifier":
                this._draw_lines_allquantifier(color, linewidth)
                truthpath.forEach((p, idx) => {
                    let [_1, diagram_object, _2] = this.dom_nodes[idx]
                    if (diagram_object) diagram_object._draw_truth_path(p)
                })
                break
            case "AnyQuantifier":
                let start_pos = this._dom_get_center(this.start_point)
                let end_pos = this._dom_get_center(this.end_point)
                truthpath.forEach((p, idx) => {
                    if (!p) return
                    let [dom_node, diagram_object] = this.dom_nodes[idx]
                    let node_left, node_right
                    if (diagram_object) {
                        diagram_object._draw_truth_path(p)
                        node_left = this._dom_get_center(diagram_object.start_point)
                        node_right = this._dom_get_center(diagram_object.end_point)
                    }
                    else {
                        node_left = this._dom_get_left(dom_node)
                        node_right = this._dom_get_right(dom_node)
                    }
                    this._draw_line(start_pos, node_left, color, linewidth)
                    this._draw_line(end_pos, node_right, color, linewidth)
                })
                break
            default:
                console.error(
                    "LadderDiagram._draw_truth_path: Invalid circuit type. "
                    + "Expected AllQuantifier | AnyQuantifier. Got "
                    + `${this.graph_type}`)
        }

    }

    _node_is_true(cidx) {
        let node = this.circuit.children[cidx]
        return (node.known == 'T' && !node.isnegated) ||
            (node.known == 'F' && node.isnegated)
    }

    _init_events() {
        this.redraw_lines = () => {
            const bb = this.dom_diagram.getBoundingClientRect()
            const bbe = this.dom_diagram_elements.getBoundingClientRect()
            const canvas = this.dom_diagram_lines
            this.ctx.clearRect(0, 0, canvas.width, canvas.height)
            canvas.width = bbe.width
            canvas.height = bbe.height
            canvas.style.top = `${bbe.top - bb.top}px`
            canvas.style.left = `${bbe.left - bb.left}px`
            this._init_lines()
        }
        addEventListener("resize", (event) => this.redraw_lines())
        this.dom_diagram
            .addEventListener("scroll", (event) => this.redraw_lines())
        document
            .addEventListener('DOMContentLoaded', (event) => this.redraw_lines())
    }

    /**
     * Returns a TruthPath if `circuit` evaluates to a True value.
     * Otherwise it returns a null
     * @returns {null | TruthPath} Path to take across the diagram 
     */
    get_truth_path() {
        let ret = []
        switch (this.graph_type) {
            case "AllQuantifier":
                this.dom_nodes.forEach((c, cidx) => {
                    if (!ret) return
                    let nodepath = c[1] ? c[1].get_truth_path() : this._node_is_true(cidx)
                    ret.push(nodepath)
                })
                ret = ret.some(x => !x) ? null : ret
                break
            case "AnyQuantifier":
                this.dom_nodes.some((c, cidx) => {
                    let nodepath = c[1] ? c[1].get_truth_path() : this._node_is_true(cidx)
                    ret.push(nodepath)
                })
                ret = ret.some(x => x) ? ret : null
                break
            default:
                console.error(
                    "LadderDiagram.has_truth_path: Invalid circuit type. "
                    + "Expected AllQuantifier | AnyQuantifier. Got "
                    + `${this.graph_type}`)
        }
        return ret
    }

    /**
     * Returns if `circuit` evaluates to a True value
     * @returns {Boolean} If `circuit` evaluates to a True value
     */
    has_truth_path() {
        return Boolean(this.get_truth_path())
    }

}

export { LadderDiagram }
