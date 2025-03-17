"use client"

import { useState, useCallback, useRef, useEffect } from "react"
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
import { DollarSign, Globe, CreditCard, Save, Upload, ChevronLeft, ChevronRight, Menu, X } from "lucide-react"
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
  
  // Responsive state
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  // Update window width on resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
      setIsMobile(window.innerWidth < 768)
      
      // Auto-close sidebars on small screens
      if (window.innerWidth < 768) {
        setLeftSidebarOpen(false)
        setRightSidebarOpen(false)
      } else if (window.innerWidth < 1024) {
        // On medium screens, show at least one sidebar
        if (leftSidebarOpen && rightSidebarOpen) {
          setRightSidebarOpen(false)
        }
      } else {
        // On large screens, open both by default
        setLeftSidebarOpen(true)
        setRightSidebarOpen(true)
      }
    }

    // Initial check
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // When a node is selected, open the right sidebar on mobile
  useEffect(() => {
    if (selectedNode && isMobile) {
      setRightSidebarOpen(true)
      setLeftSidebarOpen(false) // Close left sidebar to make space
    }
  }, [selectedNode, isMobile])

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
      
      // On mobile, close the left sidebar after dropping a node
      if (isMobile) {
        setLeftSidebarOpen(false)
      }
    },
    [reactFlowInstance, dispatch, isMobile],
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
    
    // On mobile, close right sidebar after deleting
    if (isMobile) {
      setRightSidebarOpen(false)
    }
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

  // Toggle sidebars
  const toggleLeftSidebar = () => {
    setLeftSidebarOpen(!leftSidebarOpen)
    // On mobile or tablet, close the other sidebar when opening this one
    if (!leftSidebarOpen && windowWidth < 1024) {
      setRightSidebarOpen(false)
    }
  }

  const toggleRightSidebar = () => {
    setRightSidebarOpen(!rightSidebarOpen)
    // On mobile or tablet, close the other sidebar when opening this one
    if (!rightSidebarOpen && windowWidth < 1024) {
      setLeftSidebarOpen(false)
    }
  }

  // Add these handlers inside your FlowChart component
  const onTouchStart = (event, nodeType, nodeLabel) => {
    event.preventDefault();
    const touch = event.touches[0];
    const target = event.target;
    
    // Store the node data
    target.dataset.nodeType = nodeType;
    target.dataset.nodeLabel = nodeLabel;
  };

  const onTouchMove = (event) => {
    event.preventDefault();
  };

  const onTouchEnd = (event) => {
    event.preventDefault();
    
    if (!reactFlowInstance) return;

    const touch = event.changedTouches[0];
    const target = event.target;
    const nodeType = target.dataset.nodeType;
    const nodeLabel = target.dataset.nodeLabel;
    
    if (!nodeType || !nodeLabel) return;

    const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
    const position = reactFlowInstance.project({
      x: touch.clientX - reactFlowBounds.left,
      y: touch.clientY - reactFlowBounds.top,
    });

    const newNode = {
      id: `${Date.now()}`,
      type: nodeType,
      position,
      data: { label: nodeLabel },
    };

    dispatch(addNode(newNode));
  };

  return (
    <div className="flex flex-col h-screen w-full">
      {/* Mobile Top Menu Bar */}
      {isMobile && (
        <div className="flex justify-between items-center bg-gray-100 p-2 border-b">
          <button 
            onClick={toggleLeftSidebar}
            className="p-2 flex items-center justify-center text-gray-700 hover:bg-gray-200 rounded"
          >
            {leftSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          
          <div className="text-center font-medium">Flow Designer</div>
          
          <button 
            onClick={toggleRightSidebar}
            className="p-2 flex items-center justify-center text-gray-700 hover:bg-gray-200 rounded"
          >
            {rightSidebarOpen ? <X size={18} /> : (
              selectedNode ? <ChevronLeft size={18} /> : <ChevronRight size={18} />
            )}
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Node Types */}
        <div 
          className={`${
            leftSidebarOpen ? 'flex' : 'hidden'
          } flex-col ${
            isMobile ? 'absolute z-10 h-full' : 'relative'
          } bg-gray-50 border-r overflow-y-auto transition-all duration-300`}
          style={{ 
            width: isMobile ? '80%' : leftSidebarOpen ? '220px' : '0',
            height: isMobile ? 'calc(100% - 40px)' : '100%'
          }}
        >
          <div className="p-2 flex-1 overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <h3 className="mt-0 mb-0">Flow Elements</h3>
              {!isMobile && (
                <button 
                  onClick={toggleLeftSidebar} 
                  className="p-1 text-gray-500 hover:text-gray-800"
                >
                  <ChevronLeft size={16} />
                </button>
              )}
            </div>
            
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
                        onTouchStart={(event) => onTouchStart(event, category.type, item)}
                        onTouchMove={onTouchMove}
                        onTouchEnd={onTouchEnd}
                        style={{ touchAction: 'none' }}
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
        </div>

        {/* Collapsed Left Sidebar Toggle */}
        {!leftSidebarOpen && !isMobile && (
          <button
            onClick={toggleLeftSidebar}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-gray-100 p-1 hover:bg-gray-200 rounded-r border"
          >
            <ChevronRight size={16} />
          </button>
        )}

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
            touchDevice={true}
          >
            <Controls />
            <MiniMap 
              style={{ display: isMobile ? 'none' : 'block' }} 
              nodeColor={(node) => {
                switch (node.type) {
                  case 'payment':
                    return '#ffcc00';
                  case 'location':
                    return '#00ccff';
                  case 'gateway':
                    return '#00ff99';
                  default:
                    return '#ffffff';
                }
              }}
            />
            <Background variant="dots" gap={12} size={1} />
          </ReactFlow>

          {/* Mobile Floating Action Buttons */}
          {isMobile && !leftSidebarOpen && !rightSidebarOpen && (
            <div className="absolute bottom-4 right-4 flex flex-col gap-2">
              <button 
                onClick={saveWorkflow}
                disabled={isLoading || !nodes.length}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-500 text-white shadow-lg disabled:bg-gray-300"
              >
                <Save size={20} />
              </button>
              <button 
                onClick={loadWorkflow}
                disabled={isLoading}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-green-500 text-white shadow-lg disabled:bg-gray-300"
              >
                <Upload size={20} />
              </button>
            </div>
          )}

          {/* Status Message Toast for Mobile */}
          {isMobile && statusMessage && (
            <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white p-3 rounded shadow-lg text-sm">
              {statusMessage}
            </div>
          )}
        </div>

        {/* Right Sidebar - Node Properties */}
        <div 
          className={`${
            rightSidebarOpen ? 'flex' : 'hidden'
          } flex-col ${
            isMobile ? 'absolute right-0 z-10 h-full' : 'relative'
          } bg-gray-50 border-l overflow-y-auto transition-all duration-300`}
          style={{ 
            width: isMobile ? '80%' : rightSidebarOpen ? '220px' : '0',
            height: isMobile ? 'calc(100% - 40px)' : '100%'
          }}
        >
          <div className="p-2 flex-1 overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <h3 className="mt-0 mb-0">Node Properties</h3>
              {!isMobile && (
                <button 
                  onClick={toggleRightSidebar} 
                  className="p-1 text-gray-500 hover:text-gray-800"
                >
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
            
            {selectedNode ? (
              <div>
                <div className="mb-3">
                  <label className="block mb-1 font-medium">Node ID:</label>
                  <div className="p-1 bg-gray-200 overflow-hidden text-ellipsis">{selectedNode.id}</div>
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
                <button 
                  onClick={deleteSelectedNode} 
                  className="bg-red-500 text-white border-0 p-2 w-full cursor-pointer"
                >
                  Delete Node
                </button>
              </div>
            ) : (
              <div className="text-gray-500">Select a node to view and edit its properties</div>
            )}
          </div>
        </div>
        
        {/* Collapsed Right Sidebar Toggle */}
        {!rightSidebarOpen && !isMobile && (
          <button
            onClick={toggleRightSidebar}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-gray-100 p-1 hover:bg-gray-200 rounded-l border"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>
    </div>
  )
}