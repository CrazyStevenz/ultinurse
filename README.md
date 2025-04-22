# UltiNurse

A nursing staff management platform.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing
purposes.

### Prerequisites

1. [git](https://git-scm.com/download)

2. [pnpm](https://pnpm.io/installation)

3. [fnm (Fast Node Manager)](https://github.com/Schniz/fnm?tab=readme-ov-file#installation) / [nvm (Node Version Manager)](https://github.com/nvm-sh/nvm#installing-and-updating) /
   A manual installation of Node 20.x

4. [podman](https://podman.io/docs/installation)

### Downloading

Navigate to the folder where you want the project to be saved and run the following command:

```sh
git clone https://github.com/CrazyStevenz/optinurse.git
```

### Preparing

*(If using fnm/nvm)*

```sh
nvm use
```

Install node modules.

```sh
pnpm install
```

Copy the example env to create your own.

```sh
cp .env.example .env
```

Follow the instructions in the .env to generate a NextAuth secret, and check their docs to setup login with Github.

Then, you need to setup your local database. To do that (and to start it every time after that) run:

```sh
pnpm run db:start
```

### Running

#### Development

To start the dev server, run:

```sh
pnpm run dev
```

Wait for it to compile and click the `http://localhost:3000` link when it appears.

#### Production

TBD

### Learn More

To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available) — Check out these awesome tutorials

