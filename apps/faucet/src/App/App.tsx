import React, { createContext, useEffect, useState } from "react";
import { ThemeProvider } from "styled-components";

import { Heading } from "@namada/components";
import { ColorMode, getTheme } from "@namada/utils";

import {
  AppContainer,
  BackgroundImage,
  Banner,
  BannerContents,
  BottomSection,
  ContentContainer,
  FaucetContainer,
  GlobalStyles,
  TopSection,
} from "App/App.components";
import { FaucetForm } from "App/Faucet";

import { requestSettings } from "utils";
import dotsBackground from "../../public/bg-dots.svg";
import { CallToActionCard } from "./CallToActionCard";
import { CardsContainer } from "./Card.components";
import { Faq } from "./Faq";

const DEFAULT_URL = "http://localhost:5000";
const DEFAULT_ENDPOINT = "/api/v1/faucet";
const DEFAULT_FAUCET_LIMIT = "1000";

const {
  NAMADA_INTERFACE_FAUCET_API_URL: faucetApiUrl = DEFAULT_URL,
  NAMADA_INTERFACE_FAUCET_API_ENDPOINT: faucetApiEndpoint = DEFAULT_ENDPOINT,
  NAMADA_INTERFACE_FAUCET_LIMIT: faucetLimit = DEFAULT_FAUCET_LIMIT,
  NAMADA_INTERFACE_PROXY: isProxied,
  NAMADA_INTERFACE_PROXY_PORT: proxyPort = 9000,
} = process.env;

const apiUrl = isProxied ? `http://localhost:${proxyPort}/proxy` : faucetApiUrl;
const url = `${apiUrl}${faucetApiEndpoint}`;
const limit = parseInt(faucetLimit);
const runFullNodeUrl = "https://docs.namada.net/operators/ledger";
const becomeBuilderUrl = "https://docs.namada.net/integrating-with-namada";

type Settings = {
  difficulty?: number;
  tokens?: Record<string, string>;
  startsAt: number;
  startsAtText?: string;
};

type AppContext = Settings & {
  limit: number;
  url: string;
  settingsError?: string;
};

const START_TIME_UTC = 1702918800;
const START_TIME_TEXT = new Date(START_TIME_UTC * 1000).toLocaleString(
  "en-gb",
  {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
  }
);

const defaults = {
  startsAt: START_TIME_UTC,
  startsAtText: `${START_TIME_TEXT} UTC`,
};

export const AppContext = createContext<AppContext>({
  ...defaults,
  limit,
  url,
});

export const App: React.FC = () => {
  const initialColorMode = "dark";
  const [colorMode, _] = useState<ColorMode>(initialColorMode);
  const [isTestnetLive, setIsTestnetLive] = useState(true);
  const [settings, setSettings] = useState<Settings>({
    ...defaults,
  });
  const [settingsError, setSettingsError] = useState<string>();
  const theme = getTheme(colorMode);

  useEffect(() => {
    const { startsAt } = settings;
    const now = new Date();
    const nowUTC = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes()
    );
    const startsAtToMilliseconds = startsAt * 1000;
    if (nowUTC < startsAtToMilliseconds) {
      setIsTestnetLive(false);
    }

    // Fetch settings from faucet API
    (async () => {
      try {
        const { difficulty, tokens_alias_to_address: tokens } =
          await requestSettings(url).catch((e) => {
            const message = e.errors?.message;
            setSettingsError(
              `Error requesting settings: ${message?.join(" ")}`
            );
            throw new Error(e);
          });
        // Append difficulty level and tokens to settings
        setSettings({
          ...settings,
          difficulty,
          tokens,
        });
      } catch (e) {
        setSettingsError(`Failed to load settings! ${e}`);
      }
    })();
  }, []);

  return (
    <AppContext.Provider
      value={{
        settingsError,
        limit,
        url,
        ...settings,
      }}
    >
      <ThemeProvider theme={theme}>
        <GlobalStyles colorMode={colorMode} />
        {!isTestnetLive && settings?.startsAtText && (
          <Banner>
            <BannerContents>
              Testnet will go live {settings.startsAtText}! Faucet is disabled
              until then.
            </BannerContents>
          </Banner>
        )}
        <BackgroundImage imageUrl={dotsBackground} />
        <AppContainer>
          <ContentContainer>
            <TopSection>
              <Heading uppercase themeColor="utility1" size="5xl" level="h1">
                Namada Faucet
              </Heading>
            </TopSection>
            <FaucetContainer>
              <FaucetForm isTestnetLive={isTestnetLive} />
            </FaucetContainer>
            <BottomSection>
              <CardsContainer>
                <CallToActionCard
                  description="Contribute to the Namada network's resiliency"
                  title="RUN A FULL NODE"
                  href={runFullNodeUrl}
                />
                <CallToActionCard
                  description="Integrate Namada into applications or extend its capabilities"
                  title="BECOME A BUILDER"
                  href={becomeBuilderUrl}
                />
              </CardsContainer>
              <Faq />
            </BottomSection>
          </ContentContainer>
        </AppContainer>
      </ThemeProvider>
    </AppContext.Provider>
  );
};
