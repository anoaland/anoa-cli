# Anoa CLI

React Native Typescript Boilerplate & Code Generator CLI

# Notice

This project is under development. Not ready for production yet.

# Installation

```
npm i -g anoa-cli@next
```

# Usage

## Create New React Native Project

```bash
$ anoa init <project-name>
```

**Anoa** comes with 2 boilerplates:

```bash
? Select project type you would like to use: (Use arrow keys)
  React Native Init
  Expo
```

> You need **react-native-cli** installed globally for **React Native Init** project type and/or **expo-cli** for **Expo**.

Choose an appropriate project type for you and wait until the project is ready.

```bash
? Select project type you would like to use: React Native Init
| Creating MyAwesomeApp project...
```

Once you see this:

```bash
$ √ Yay! The MyAwesomeApp project is ready!
```

It's mean boilerplate is ready. Go the the project folder and run the project!

## Project Structure

Both of **Expo** and **React Native Init** project have same structure and pattern.

At the very beginning you `init` the project, **Anoa** will only generates a minimum project structure like so:

```bash
.
├── assets               (Project assets such as images and fonts)
├── src
│   ├── views            (Views & Themes)
│   │   ├── screens
│   │   │   ├── main     (Main screen view containing simple hello world view)
│   │   │   │   ├── index.tsx
│   │   │   │   ├── props.ts
│   ├── App.tsx           (Application root component)
├── index.js              (for React Native Init) / App.js (for Expo)
```

And after you play arround with the CLI you'll get something like this:

```bash
.
├── assets               (Project assets such as images and fonts)
├── src
│   ├── data             (SQLite repositories)
│   │   ├── models
│   │   ├── providers
│   ├── store            (All about Redux)
│   │   ├── actions
│   │   ├── reducers
│   ├── views            (Views & Themes)
│   │   ├── components
│   │   ├── screens
│   │   ├── styles
│   ├── App.tsx           (Application root component)
├── index.js              (for React Native Init) / App.js (for Expo)
```

## CLI Commands

```bash
            .d8888b. 88d888b. .d8888b. .d8888b.
            88'  `88 88'  `88 88'  `88 88'  `88
            88.  .88 88    88 88.  .88 88.  .88
             88888P8 dP    dP `88888P' `88888P8
============================================================
  React Native Typescript Boilerplate & Code Generator CLI

data (d)                 Data / storage generator
init (i)                 Generate new react native boilerplate
navigation (n, nav)      Navigator generator
store (s)                Redux store generator
view (v)                 View generator
help (-h)                Show list of commands
version (-v)             Show version
```

Inside the project directory you will use these commands often:

```bash
view (v)                 View generator
navigation (n, nav)      Navigator generator
store (s)                Redux store generator
data (d)                 Data / storage generator
```

As if needed, **Anoa** will installs necessary packages for particular command you run.
For example if you generate a `reducer` for Redux, then it
will automatically adds Redux packages in the project if it doesn't exists yet.

**Example:**

Run `anoa store` command and choose `Create new reducer`:

```bash
$ anoa store
? What would you like to do with store?
> Create new reducer
  Create new action
  Add new reducer state properties
  Update application root state
```

After name and state specified, **Anoa** will installs Redux packages for you.

```bash
$ anoa store
? What would you like to do with store? Create new reducer
? Reducer name todo
? Specify state you'd like to have (separated with space, eg: foo:string='some value' bar:number=26), or leave it blank thus we will generate example for you: tasks:string[] completedTasks:string[]
√ Required packages added.
| Adding required packages...
```

After that, the new reducer should be created and ready to use.

```bash
New reducer was successfully created on src/store/reducers/todo/index.ts
```

If you check on `package.json` you should see these new packages added:

**dependencies:**

- react-redux
- redux
- redux-thunk

**devDependencies:**

- @types/react-redux

## 3rd Party Libraries

For particular commands on **Anoa** have dependencies on 3rd party libraries that will be installed automatically when the command invoked just like the Redux command above.

| Command    | Sub Command      | Dependency                                                                     | Dev Dependency          |
| ---------- | ---------------- | ------------------------------------------------------------------------------ | ----------------------- |
| store      | (All)            | [react-redux](https://react-redux.js.org/)                                     | @types/react-redux      |
|            |                  | [redux](https://redux.js.org/)                                                 |                         |
|            |                  | [redux-thunk](https://github.com/reduxjs/redux-thunk)                          |                         |
| view       | Create new theme | [anoa-react-native-theme](https://github.com/anoaland/anoa-react-native-theme) |                         |
| navigation | (All)            | [react-navigation](https://reactnavigation.org/)                               | @types/react-navigation |
| data       | (All)            | [sqlite-ts](https://github.com/budiadiono/sqlite-ts)                           |                         |

# License

MIT - see LICENSE
