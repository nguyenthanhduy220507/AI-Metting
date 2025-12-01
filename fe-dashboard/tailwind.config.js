/* eslint-disable import/no-anonymous-default-export */
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js,ts,tsx}"],
  theme: {
    extend: {
      backgroundColor: {
        primary: "#004831",
        secondary: "#afca31",
      },
      borderColor: {
        primary: "#004831",
        secondary: "#afca31",
      },
      textColor: {
        primary: "#757575",
        secondary: "#313743",
      },
    },
  },
  plugins: [],
};
