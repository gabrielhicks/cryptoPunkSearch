import * as React from 'react';
import {
  ChakraProvider,
  Box,
  Text,
  VStack,
  Button,
  Grid,
  theme,
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
  InputRightElement,
  InputGroup,
} from '@chakra-ui/react';
import { ErrorBoundary } from 'react-error-boundary';
import type { FallbackProps } from 'react-error-boundary';
import { ColorModeSwitcher } from './ColorModeSwitcher';

type PunkData = {
  number: string;
  type: string;
  image: string;
  accessories: string[];
};

type PunkInfoState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'rejected'; error: Error }
  | { status: 'resolved'; data: PunkData };

function useSafeDispatch(dispatch: any) {
  const mountedRef = React.useRef(false);

  React.useLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return React.useCallback(
    (...args) => (mountedRef.current ? dispatch(...args) : void 0),
    [dispatch]
  );
}

function asyncReducer(state: any, action: any): any {
  switch (action.type) {
    case 'pending': {
      return { status: 'pending' };
    }
    case 'resolved': {
      return { status: 'resolved', data: action.data };
    }
    case 'rejected': {
      return { status: 'rejected', error: action.error };
    }
    default: {
      throw new Error(`Unhandled action type: ${action.type}`);
    }
  }
}

function useAsync(initialState: PunkInfoState) {
  const [state, unsafeDispatch] = React.useReducer(asyncReducer, {
    // @ts-expect-error: 'status' is specified more than once, so this usage will be overwritten.
    status: 'idle',
    data: null,
    error: null,
    ...initialState,
  });

  const dispatch = useSafeDispatch(unsafeDispatch);

  const { data, error, status } = state;

  const run = React.useCallback(
    (promise) => {
      dispatch({ type: 'pending' });
      promise.then(
        (data: PunkData) => {
          dispatch({ type: 'resolved', data });
        },
        (error: Error) => {
          error.message =
            'Punk does not exist, please use the correct format when sumbitting a query!';
          dispatch({ type: 'rejected', error });
        }
      );
    },
    [dispatch]
  );

  return {
    error,
    status,
    data,
    run,
  };
}

async function fetchPunk<PunkNumber>(
  punkNumber: PunkNumber
): Promise<PunkData> {
  const res = await fetch(
    `https://cryptopunks.herokuapp.com/api/punks/${punkNumber}`
  );

  const punkData: PunkData = await res.json();

  if (!res.ok) {
    return Promise.reject(
      new Error(`No Punk found with the number ${punkNumber}`)
    );
  }

  return punkData;
}

function PunkInfo({
  punkNumber,
  number,
}: {
  punkNumber: string;
  number: string;
}) {
  const { data, status, error, run } = useAsync({
    status: punkNumber ? 'pending' : 'idle',
  });

  React.useEffect(() => {
    if (!punkNumber) {
      return;
    }

    run(fetchPunk(punkNumber));
  }, [punkNumber, run]);

  if (status === 'idle' || !punkNumber) {
    return <p> </p>;
  } else if (status === 'pending') {
    return <PunkCardFallback number={number} />;
  } else if (status === 'rejected') {
    throw error;
  } else if (status === 'resolved') {
    return <ValidPunkCard number={number} punk={data} />;
  }

  throw new Error(
    'This exists outside the error boundry and should not display'
  );
}

function ValidPunkCard({ punk, number }: { punk: PunkData; number: string }) {
  return (
    <div>
      <div style={{ width: '336px', height: '336px' }}>
        <a
          target='_blank'
          rel='noreferrer'
          href={`https://www.larvalabs.com/cryptopunks/details/${number}`}>
          <img src={punk.image} alt={punk.type} />
        </a>
      </div>
      <div
        style={{
          display: 'flex-column',
          justifyContent: 'space-around',
          height: '258px',
        }}>
        <section>
          <Text>
            <b>Punk</b>
          </Text>
          <Text fontSize='sm'>{number}</Text>
        </section>
        <section>
          <Text>
            <b>Type</b>
          </Text>
          <Text fontSize='sm'>{punk.type}</Text>
        </section>
        <section>
          <div>
            <b>Accessories</b>
            {punk.accessories ? (
              punk.accessories.map((attr) => (
                <li style={{ listStyle: 'none', fontSize: '14px' }}>
                  <Text>{attr}</Text>
                </li>
              ))
            ) : (
              <Text fontSize='sm'>Loading...</Text>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function PunkCardFallback({ number }: { number: string }) {
  const initialNumber = React.useRef(number).current;
  const fallbackPunkData: PunkData = {
    number: initialNumber,
    type: 'XXXXX',
    image: '/default.PNG',
    accessories: ['loading...'],
  };
  return <ValidPunkCard key={number} number={number} punk={fallbackPunkData} />;
}

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div role='alert'>
      There was an error:{' '}
      <pre style={{ whiteSpace: 'normal' }}>{error.message}</pre>
      <Button colorScheme='green' onClick={resetErrorBoundary}>
        Try again
      </Button>
    </div>
  );
}

export const PunkForm = ({
  punkNumber: externalPunkName,
  initialPunkName = externalPunkName ?? '',
  onSubmit,
}: {
  punkNumber: string;
  initialPunkName?: string;
  onSubmit: (newPunkName: string) => void;
}) => {
  const [punkName, setPunkName] = React.useState(initialPunkName);

  React.useEffect(() => {
    if (typeof externalPunkName === 'string') {
      setPunkName(externalPunkName);
    }
  }, [externalPunkName]);

  function handleChange(e: React.SyntheticEvent<HTMLInputElement>) {
    setPunkName(e.currentTarget.value);
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    let parsedPunk: string = '';
    if (isNaN(parseInt(punkName))) {
      return;
    }
    if (parseInt(punkName) < 100 && parseInt(punkName) >= 10) {
      parsedPunk = `0${parseInt(punkName)}`;
      onSubmit(parsedPunk);
      return;
    } else if (parseInt(punkName) < 10 && parseInt(punkName) >= 0) {
      parsedPunk = `00${parseInt(punkName)}`;
      onSubmit(parsedPunk);
      return;
    } else if (parseInt(punkName) > 9999) {
      parsedPunk = punkName.slice(0, 4);
      onSubmit(parsedPunk);
    } else {
      onSubmit(punkName);
    }
  }

  return (
    <form style={{ width: '336px' }} onSubmit={handleSubmit}>
      <FormControl>
        <FormLabel htmlFor='punkNumber' p={2} m={0}>
          CryptoPunk Search
        </FormLabel>
        <InputGroup size='sm'>
          <Input
            name='punkNumber'
            placeholder='Punk Number...'
            type='number'
            value={punkName}
            onChange={handleChange}
          />
          <InputRightElement w='4.5rem'>
            <Button size='sm' h='1.75rem' colorScheme='green' type='submit'>
              Submit
            </Button>
          </InputRightElement>
        </InputGroup>
        <FormHelperText>Type a number between 000 and 9999</FormHelperText>
      </FormControl>
    </form>
  );
};

export const App = () => {
  const [punkNumber, setPunkNumber] = React.useState('');

  function handleSubmit(newPunkNumber: string) {
    setPunkNumber(newPunkNumber);
  }

  function handleReset() {
    setPunkNumber('');
  }

  return (
    <ChakraProvider theme={theme}>
      <Box textAlign='center' fontSize='lg'>
        <Grid minH='100vh' p={3}>
          <ColorModeSwitcher justifySelf='flex-end' />
          <VStack
            alignSelf='center'
            justifySelf='center'
            height='650px'
            width='336px'
            spacing={4}>
            <PunkForm punkNumber={punkNumber} onSubmit={handleSubmit} />
            <ErrorBoundary
              FallbackComponent={ErrorFallback}
              onReset={handleReset}
              resetKeys={[punkNumber]}>
              <PunkInfo number={punkNumber} punkNumber={punkNumber} />
            </ErrorBoundary>
          </VStack>
        </Grid>
      </Box>
    </ChakraProvider>
  );
};
