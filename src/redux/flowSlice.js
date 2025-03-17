import { createSlice } from '@reduxjs/toolkit';

const initialNodes = [
  {
    id: "1",
    type: "payment",
    data: { label: "Payment of $300" },
    position: { x: 250, y: 50 },
  },
  {
    id: "2",
    type: "location",
    data: { label: "America" },
    position: { x: 250, y: 150 },
  },
  {
    id: "3",
    type: "gateway",
    data: { label: "RazorPay" },
    position: { x: 250, y: 250 },
  },
];

const initialEdges = [
  { id: "e1-2", source: "1", target: "2", type: "custom" },
  { id: "e2-3", source: "2", target: "3", type: "custom" },
];

export const flowSlice = createSlice({
  name: 'flow',
  initialState: {
    nodes: initialNodes,
    edges: initialEdges,
    selectedNode: null,
  },
  reducers: {
    setNodes: (state, action) => {
      state.nodes = Array.isArray(action.payload) ? action.payload : [];
    },
    setEdges: (state, action) => {
      state.edges = Array.isArray(action.payload) ? action.payload : [];
    },
    setSelectedNode: (state, action) => {
      state.selectedNode = action.payload;
    },
    addNode: (state, action) => {
      state.nodes = [...state.nodes, action.payload];
    },
    updateNodeLabel: (state, action) => {
      const { nodeId, newLabel } = action.payload;
      state.nodes = state.nodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, label: newLabel }
          };
        }
        return node;
      });
      if (state.selectedNode && state.selectedNode.id === nodeId) {
        state.selectedNode = state.nodes.find(node => node.id === nodeId);
      }
    },
    deleteNode: (state, action) => {
      state.nodes = state.nodes.filter(node => node.id !== action.payload);
      state.edges = state.edges.filter(edge => 
        edge.source !== action.payload && edge.target !== action.payload
      );
      state.selectedNode = null;
    },
  },
});

export const { 
  setNodes, 
  setEdges, 
  setSelectedNode, 
  addNode, 
  updateNodeLabel,
  deleteNode 
} = flowSlice.actions;

export default flowSlice.reducer; 