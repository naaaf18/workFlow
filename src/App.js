import React from 'react';
import { ChakraProvider, extendTheme } from "@chakra-ui/react";
import "./App.css";
import WorkFlow from "./components/workFlow";

const customTheme = extendTheme({});

function App() {
  return (
    <ChakraProvider theme={customTheme}>
      <div className="App">
        <WorkFlow />
      </div>
    </ChakraProvider>
  );
}

export default App;
