/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

// New color scheme based on design requirements
const primaryColor = '#85B3BD';    // Light blue-green for background
const secondaryColor = '#3A5683';  // Darker blue for navbar and buttons
const tertiaryColor = '#FFFFFF';   // White for textboxes

export const Colors = {
  light: {
    text: '#000000',           // Black text on primary background
    background: primaryColor,  // Primary color for background
    tint: secondaryColor,      // Secondary color for active elements
    icon: '#FFFFFF',          // White icons on secondary color
    tabIconDefault: '#FFFFFF', // White icons on secondary color
    tabIconSelected: '#FFFFFF', // White icons on secondary color
    // Additional colors for the new scheme
    primary: primaryColor,
    secondary: secondaryColor,
    tertiary: tertiaryColor,
    textOnPrimary: '#000000',   // Black text on primary color
    textOnSecondary: '#FFFFFF', // White text on secondary color
    textOnTertiary: '#000000',  // Black text on tertiary color
    buttonBackground: secondaryColor,
    buttonText: '#FFFFFF',
    inputBackground: tertiaryColor,
    inputBorder: secondaryColor,
    inputText: '#000000',
  },
  dark: {
    text: '#000000',           // Black text on primary background
    background: primaryColor,  // Primary color for background
    tint: secondaryColor,      // Secondary color for active elements
    icon: '#FFFFFF',          // White icons on secondary color
    tabIconDefault: '#FFFFFF', // White icons on secondary color
    tabIconSelected: '#FFFFFF', // White icons on secondary color
    // Additional colors for the new scheme
    primary: primaryColor,
    secondary: secondaryColor,
    tertiary: tertiaryColor,
    textOnPrimary: '#000000',   // Black text on primary color
    textOnSecondary: '#FFFFFF', // White text on secondary color
    textOnTertiary: '#000000',  // Black text on tertiary color
    buttonBackground: secondaryColor,
    buttonText: '#FFFFFF',
    inputBackground: tertiaryColor,
    inputBorder: secondaryColor,
    inputText: '#000000',
  },
};
