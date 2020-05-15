<h1 align="center">pxspace bot</h1>
<p align="center">
    <a href="https://discord.gg/CxG3f7S">
        <img src="https://img.shields.io/discord/675323046680330261.svg?label=Discord&logo=discord" alt="Discord"/>
    </a>

</p>

## Support the Project <br>
**Donate with Bitcoin:** 1ADioYCgDZm4w4seNi2BmESjRtL4VqRokx **Or** <a href="https://raw.githubusercontent.com/Felipefury/pxspace-bot/master/ignore_folder/qr.png">QR Bitcoin addresss</a><br>
**Or with PayPal:** contact me

<hr> </hr>

## Installation and Configuration

1. Install <a href="https://nodejs.org/en/">Node.js </a>
2. Download and extract the <a href="https://github.com/Felipefury/pxspace-bot/archive/master.zip">repository </a>to your pc.
3. Click on install.bat (it'll auto close, if it doesn't close after few minutes, restart it).
4. Geting your id and secrect code:
    <ul>
    <li>go to <a href="https://pxspace.herokuapp.com/" rel="nofollow">https://pxspace.herokuapp.com/</a></li>
    <li>press <strong>F12</strong> or <strong> Ctrl + Shift + i </strong></li>
    <li>open <strong>console</strong> tab</li>
    <li>paste the line <code>localStorage.user.split(',')</code> and press Enter</li>
    <li>copy output and paste in <code>config.json</code>, like this:</li>
    </ul>
    
 ![config example](https://raw.githubusercontent.com/Felipefury/pxspace-bot/master/ignore_folder/config.png)

## Usage

1. drop the .png images in the bot folder:
![template example](https://raw.githubusercontent.com/Felipefury/pxspace-bot/master/ignore_folder/template_example.png)
2.1 ***v3.0*** Image name must match: **QUEUE_X_Y_STRATEGY_TIMELAPSETIMER, Example: 0_-30_70_LUF_120 (strategy and timer is optional, timelapse timer in seconds)** <br>
2.2 ***v2.0*** templates are configurable by cmd
3. Click on run.bat (it'll open a window), enjoy xD

## Strategies

**LUF = LinearUpperLeft <br>
LBR = LinearBottomRigth <br>
RDM = Random pixels <br>
JMP = Jump a few pixels**

## Todo

> difference folder, this folder shows the wrong pixels of a template compared to the game
