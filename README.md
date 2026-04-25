# Vali Config Builder

A web-based GUI for generating configuration files for the **Vali GeoGuessr map generator**.

## Features

- **Individual Country Counts**: Set the exact number of locations for each country.
- **Automatic Total Calculation**: Real-time summation of all location counts.
- **Multi-Preset Filters**: Combine filters like "Urban" and "Coastal" using logical `and` operators.
- **Live Preview**: Real-time JSON schema generation as you tweak settings.
- **Premium Design**: Modern dark mode with glassmorphism and smooth animations.

## How to Use

1.  Search and select countries for your map.
2.  Set the number of locations for each country in the "Location Distribution" section.
3.  Apply filter presets or write custom expressions.
4.  Click **Download Config JSON**.
5.  Run Vali CLI with your downloaded file:
    ```bash
    vali generate --file config.json
    ```

## Credits

Developed as a companion tool for the [Vali](https://github.com/slashP/Vali) map generator.
