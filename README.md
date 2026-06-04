#  Snooker Game

A complete browser-based snooker game built with HTML5 Canvas and JavaScript. Play snooker online with realistic physics, sound effects, and full snooker rules.

**Play now:** [https://wangdp96.github.io/snooker-game/](https://wangdp96.github.io/snooker-game/)

## Features

- **Realistic Physics**: Elastic collisions, friction, and cushion bouncing
- **Full Snooker Rules**: Red-color alternation, fouls, respawning colors, color clearance sequence
- **Sound Effects**: Hit, pot, and foul sounds using Web Audio API
- **Two Player Mode**: Local hot-seat multiplayer
- **Responsive Design**: Works on desktop and mobile devices
- **No Dependencies**: Pure HTML/CSS/JavaScript, no frameworks needed

## How to Play

1. **Aim**: Move your mouse to aim the cue stick
2. **Shoot**: Click to shoot the cue ball
3. **Power**: Adjust the power slider to control shot strength
4. **Pot Reds**: Start by potting red balls (1 point each)
5. **Pot Colors**: After potting a red, pot any color ball
6. **Continue**: Alternate reds and colors until all reds are potted
7. **Clear Colors**: Pot colors in order (yellow, green, brown, blue, pink, black)

## Ball Values

| Ball | Color | Value |
|------|-------|-------|
| Red |  Red | 1 |
| Yellow |  Yellow | 2 |
| Green |  Green | 3 |
| Brown |  Brown | 4 |
| Blue |  Blue | 5 |
| Pink |  Pink | 6 |
| Black |  Black | 7 |

## Controls

- **Mouse Move**: Aim the cue
- **Left Click**: Shoot / Place cue ball
- **Power Slider**: Adjust shot power (10-100%)
- **New Game**: Reset the game
- **Place Cue Ball**: Manually position the cue ball (after foul)
- **Sound Toggle**: Enable/disable sound effects

## Rules Summary

- **Start**: Player 1 breaks off, must hit a red ball first
- **Sequence**: Pot a red, then pot a color, then pot a red, etc.
- **Colors Respawn**: Colors return to their spots after being potted (while reds remain)
- **Fouls**: 
  - Cue ball potted: 4 points to opponent
  - Wrong ball hit first: Value of ball or 4 points (whichever is higher)
  - Wrong ball potted: Value of ball or 4 points (whichever is higher)
- **End Game**: After all reds are potted, pot colors in ascending order
- **Winner**: Player with highest score wins

## Tech Stack

- **HTML5 Canvas**: Game rendering
- **JavaScript**: Game logic and physics
- **CSS3**: Responsive styling
- **Web Audio API**: Sound effects
- **GitHub Pages**: Free hosting

## Development

```bash
# Clone the repository
git clone https://github.com/wangdp96/snooker-game.git

# Open in browser
open snooker-game/index.html
```

## License

MIT License - feel free to use and modify!

## Acknowledgments

- Snooker rules based on official WPBSA rules
- Physics implementation inspired by classic billiard games
- Hosted on GitHub Pages for free worldwide access

---

Made with  and JavaScript
