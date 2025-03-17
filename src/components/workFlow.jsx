"use client"

import { useState, useCallback, useRef } from "react"
import { useDispatch, useSelector } from 'react-redux'
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  applyNodeChanges,
  applyEdgeChanges
} from "reactflow"
import "reactflow/dist/style.css"
import { DollarSign, Globe, CreditCard, Save, Upload } from "lucide-react"
import { 
  setNodes, 
  setEdges, 
  setSelectedNode, 
  addNode, 
  updateNodeLabel,
  deleteNode 
} from '../redux/flowSlice'

// Mock API service for workflow persistence
const apiService = {
  saveWorkflow: async (data) => {
    // Simulate API call with a 1 second delay
    return new Promise((resolve) => {
      setTimeout(() => {
        // In a real application, this would be a fetch call to your API
        console.log("Saving workflow to API:", data);
        // Store in localStorage as a mock database
        localStorage.setItem('savedWorkflow', JSON.stringify(data));
        resolve({ success: true, message: "Workflow saved successfully" });
      }, 1000);
    });
  },
  
  loadWorkflow: async () => {
    // Simulate API call with a 1 second delay
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // In a real application, this would be a fetch call to your API
        const savedData = localStorage.getItem('savedWorkflow');
        if (savedData) {
          resolve({ success: true, data: JSON.parse(savedData) });
        } else {
          reject({ success: false, message: "No saved workflow found" });
        }
      }, 1000);
    });
  }
};

// Custom node components with proper ReactFlow handles
const customNodeTypes = {
  payment: ({ data }) => (
    <div className="border p-2 w-40 text-center relative bg-white">
      {/* Source handle at the bottom */}
      <Handle type="source" position={Position.Bottom} id="source" style={{ background: "#555" }} />

      {/* Target handle at the top */}
      <Handle type="target" position={Position.Top} id="target" style={{ background: "#555" }} />

      <div className="flex items-center justify-center gap-2">
        <DollarSign size={16} />
        <div>{data.label}</div>
      </div>
    </div>
  ),
  location: ({ data }) => (
    <div className="border p-2 w-40 text-center relative bg-white">
      {/* Source handle at the bottom */}
      <Handle type="source" position={Position.Bottom} id="source" style={{ background: "#555" }} />

      {/* Target handle at the top */}
      <Handle type="target" position={Position.Top} id="target" style={{ background: "#555" }} />

      <div className="flex items-center justify-center gap-2">
        <Globe size={16} />
        <div>{data.label}</div>
      </div>
    </div>
  ),
  gateway: ({ data }) => (
    <div className="border p-2 w-40 text-center relative bg-white">
      {/* Only target handle at the top for gateway nodes */}
      <Handle type="target" position={Position.Top} id="target" style={{ background: "#555" }} />

      <div className="flex items-center justify-center gap-2">
        <CreditCard size={16} />
        <div>{data.label}</div>
      </div>
    </div>
  ),
}

// Sidebar node types
const sidebarNodeTypes = [
  { type: "payment", label: "Payment Amount", items: ["Payment of $300", "Payment of $400", "Payment of $500"] },
  { type: "location", label: "Transaction Location", items: ["America", "Europe", "UK"] },
  { type: "gateway", label: "Payment Gateway", items: ["Google Pay", "RazorPay", "PayPal"] },
]

export default function FlowChart() {
  const dispatch = useDispatch();
  const { nodes, edges, selectedNode } = useSelector((state) => state.flow);
  
  const reactFlowWrapper = useRef(null)
  const [reactFlowInstance, setReactFlowInstance] = useState(null)
  const [expandedType, setExpandedType] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState(null)

  // Handle node selection
  const onNodeClick = (_, node) => {
    dispatch(setSelectedNode(node));
  }

  // Handle node changes
  const onNodesChange = useCallback(
    (changes) => {
      dispatch(setNodes(applyNodeChanges(changes, nodes)));
    },
    [nodes, dispatch]
  );

  // Handle edge changes
  const onEdgesChange = useCallback(
    (changes) => {
      dispatch(setEdges(applyEdgeChanges(changes, edges)));
    },
    [edges, dispatch]
  );

  // Edge connection handler
  const onConnect = useCallback(
    (params) => {
      dispatch(setEdges(addEdge({ ...params, type: "custom" }, edges)));
    },
    [edges, dispatch]
  );

  // Handle node drag over
  const onDragOver = useCallback((event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  // Handle dropping a new node onto the canvas
  const onDrop = useCallback(
    (event) => {
      event.preventDefault()

      if (!reactFlowInstance) return

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect()
      const nodeType = event.dataTransfer.getData("nodeType")
      const nodeLabel = event.dataTransfer.getData("nodeLabel")

      if (!nodeType || !nodeLabel) return

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      })

      const newNode = {
        id: `${Date.now()}`,
        type: nodeType,
        position,
        data: { label: nodeLabel },
      }

      dispatch(addNode(newNode))
    },
    [reactFlowInstance, dispatch],
  )

  // Handle node label update
  const handleUpdateNodeLabel = (newLabel) => {
    if (!selectedNode) return
    dispatch(updateNodeLabel({ nodeId: selectedNode.id, newLabel }));
  }

  // Toggle sidebar category expansion
  const toggleExpand = (type) => {
    setExpandedType(expandedType === type ? null : type)
  }

  // Initialize draggable items from left sidebar
  const onDragStart = (event, nodeType, nodeLabel) => {
    event.dataTransfer.setData("nodeType", nodeType)
    event.dataTransfer.setData("nodeLabel", nodeLabel)
    event.dataTransfer.effectAllowed = "move"
  }

  // Delete selected node
  const deleteSelectedNode = () => {
    if (!selectedNode) return
    dispatch(deleteNode(selectedNode.id));
  }

  // Save workflow to API
  const saveWorkflow = async () => {
    setIsLoading(true);
    setStatusMessage("Saving workflow...");
    
    try {
      const workflowData = {
        nodes,
        edges
      };
      
      const response = await apiService.saveWorkflow(workflowData);
      setStatusMessage(response.message);
    } catch (error) {
      setStatusMessage("Error saving workflow.");
      console.error("Save workflow error:", error);
    } finally {
      setIsLoading(false);
      // Clear status message after 3 seconds
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };
  
  // Load workflow from API
  const loadWorkflow = async () => {
    setIsLoading(true);
    setStatusMessage("Loading workflow...");
    
    try {
      const response = await apiService.loadWorkflow();
      
      if (response.success && response.data) {
        dispatch(setNodes(response.data.nodes));
        dispatch(setEdges(response.data.edges));
        dispatch(setSelectedNode(null));
        setStatusMessage("Workflow loaded successfully.");
        
        // Fit view after a small delay to ensure nodes are rendered
        setTimeout(() => {
          if (reactFlowInstance) {
            reactFlowInstance.fitView();
          }
        }, 100);
      }
    } catch (error) {
      setStatusMessage("No saved workflow found.");
      console.error("Load workflow error:", error);
    } finally {
      setIsLoading(false);
      // Clear status message after 3 seconds
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  return (
    <div className="flex w-full h-screen">
      {/* Left Sidebar - Node Types */}
      <div className="w-[220px] border-r bg-gray-50 p-2 overflow-y-auto">
        <h3 className="mt-0 mb-2">Flow Elements</h3>
        {sidebarNodeTypes.map((category) => (
          <div key={category.type} className="mb-2">
            <div
              className="flex justify-between items-center p-2 bg-gray-200 cursor-pointer"
              onClick={() => toggleExpand(category.type)}
            >
              {category.label}
              <span>{expandedType === category.type ? "▼" : "►"}</span>
            </div>
            {expandedType === category.type && (
              <div className="pl-2 mt-1">
                {category.items.map((item, index) => (
                  <div
                    key={index}
                    className="border p-2 mb-1 bg-white cursor-grab"
                    draggable
                    onDragStart={(event) => onDragStart(event, category.type, item)}
                  >
                    {item}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        
        {/* Persistence Controls */}
        <div className="mt-4 border-t pt-4">
          <h3 className="mt-0 mb-2">Workflow Actions</h3>
          <div className="flex flex-col gap-2">
            <button 
              onClick={saveWorkflow}
              disabled={isLoading || !nodes.length}
              className="flex items-center justify-center gap-1 p-2 bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              Save Workflow
            </button>
            <button 
              onClick={loadWorkflow}
              disabled={isLoading}
              className="flex items-center justify-center gap-1 p-2 bg-green-500 text-white hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <Upload size={16} />
              Load Workflow
            </button>
            
            {statusMessage && (
              <div className="mt-2 p-2 bg-gray-100 text-center text-sm">
                {statusMessage}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Canvas */}
      <div ref={reactFlowWrapper} className="flex-1 h-full relative">
        <ReactFlow
          nodes={nodes || []}
          edges={edges || []}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          nodeTypes={customNodeTypes}
          fitView
        >
          <Controls />
          <MiniMap />
          <Background variant="dots" gap={12} size={1} />
        </ReactFlow>
      </div>

      {/* Right Sidebar - Node Properties */}
      <div className="w-[220px] border-l bg-gray-50 p-2 overflow-y-auto">
        <h3 className="mt-0 mb-2">Node Properties</h3>
        {selectedNode ? (
          <div>
            <div className="mb-3">
              <label className="block mb-1 font-medium">Node ID:</label>
              <div className="p-1 bg-gray-200">{selectedNode.id}</div>
            </div>
            <div className="mb-3">
              <label className="block mb-1 font-medium">Node Type:</label>
              <div className="p-1 bg-gray-200">{selectedNode.type}</div>
            </div>
            <div className="mb-3">
              <label className="block mb-1 font-medium">Label:</label>
              <input
                type="text"
                value={selectedNode.data.label}
                onChange={(e) => handleUpdateNodeLabel(e.target.value)}
                className="w-full p-1 border"
              />
            </div>
            <div className="mb-3">
              <label className="block mb-1 font-medium">Position:</label>
              <div className="p-1 bg-gray-200">
                X: {Math.round(selectedNode.position.x)}, Y: {Math.round(selectedNode.position.y)}
              </div>
            </div>
            <button onClick={deleteSelectedNode} className="bg-red-500 text-white border-0 p-2 w-full cursor-pointer">
              Delete Node
            </button>
          </div>
        ) : (
          <div className="text-gray-500">Select a node to view and edit its properties</div>
        )}
      </div>
    </div>
  )
}