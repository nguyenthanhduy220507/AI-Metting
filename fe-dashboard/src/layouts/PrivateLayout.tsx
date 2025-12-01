// ==============================
// Imports
// ==============================

// MUI Components
import Box from "@mui/material/Box";

// Libraries
import { useState } from "react";
import { Outlet } from "react-router-dom";

// Local components
// import MiniDrawer from "../components/MiniDrawer";

const PrivateLayout = () => {
  // States
  const [open, setOpen] = useState(true);

  // ==============================
  // Render
  // ==============================
  return (
    <>
      <Box sx={{ display: "flex" }}>
        {/* <MiniDrawer open={open} setOpen={setOpen} /> */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 6,
            height: "100vh",
            width: "100vw",
            mt: 8,
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </>
  );
};

export default PrivateLayout;
