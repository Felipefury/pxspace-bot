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

* **Linear**
    * **LUL** top left to top right, chess mode use **LULCH**
    * **LUB** top left to bottom left, chess mode use **LUBCH**
    * **LBR** bottom right to bottom left, chess mode use **LBRCH**
    * **LBU** bottom right to top right, chess mode use **LBUCH**
    * **JMP** jump a few pixels.
    
* **Random**
    * **RDM** paint random pixels.
    
* **Radial**
    * **RAD** expands from center creating a circle, chess mode use **RADCH**
    * **RADOT** outside to the center, chess mode use **RADOTCH**
    * **RADTL** expands from top left creating a circle.
    * **RADTR** expands from top right creating a circle.
    * **RADBL** expands from bottom left creating a circle.
    * **RADBR** expands from bottom right creating a circle.

* **additional**
    * add **#** at the end of your strategy to paint only pixels that have already been painted **(if color ≠ 0 )**, example ``LULCH#``
    * add **$** at the end of your strategy to paint only pixels that were **NOT** painted **(if color = 0 )**, example ``RAD$``

***corrections and suggestions***

- [x] Fix y 0 line bug
- [ ] Connect more than one account in the bot (a possible update make this impossible)
- [x] More information in the log (press "b" or "n" for more information)
- [x] More strategies

## Todo

> difference folder, this folder shows the wrong pixels of a template compared to the game
