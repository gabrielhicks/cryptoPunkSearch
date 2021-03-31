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

//////////////////////////////////////////////////////////////////////////////////
// Types: Many types are in-line aswell                                         //
//                                                                              //
// Todo:                                                                        //
// - Learn more, finish useCallback and useReducer types!                       //
//                                                                              //
//////////////////////////////////////////////////////////////////////////////////

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

// type ActionType = {
//   type: string;
//   data: PunkData;
//   error: Error;
// };

//////////////////////////////////////////////////////////////////////////////////
// useSafeDispatch: Only will call dispatch if component is mounted             //
//                                                                              //
// - Cancels async tasks, rerenders only when component is mounted              //
// - Takes in args, wraps and returns                                           //
//                                                                              //
//                                                                              //
//////////////////////////////////////////////////////////////////////////////////

function useSafeDispatch(dispatch: any) {
  const mountedRef = React.useRef(false);

  // runs and cleans BEFORE DOM is painted
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

//////////////////////////////////////////////////////////////////////////////////
// asyncReducer: Custom reducer function to handle our many cases and states!   //
//                                                                              //
// - Written generically this reducer is easily used across many apps           //
// - Works perfect with state check when rendering fallbacks/data               //
// - Extensible!                                                                //
//                                                                              //
//////////////////////////////////////////////////////////////////////////////////

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

//////////////////////////////////////////////////////////////////////////////////
// useAsync: Custom hook to memoize and optimize our fetch request!             //
//                                                                              //
// - Provides accesss to async lifecycle, allowing for a timeout                //
// - Written to eb reusable with minor adapting across APIs and apps            //
//                                                                              //
//////////////////////////////////////////////////////////////////////////////////

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

  // Memoizes our fetch request, cuts down requests to API
  // Don't want function rerendering or refetching in useEffect
  const run = React.useCallback(
    (promise) => {
      dispatch({ type: 'pending' });
      promise.then(
        (data: PunkData) => {
          setTimeout(() => {
            dispatch({ type: 'resolved', data });
          }, 2000);
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

  // Allow use in other areas of app
  return {
    error,
    status,
    data,
    run,
  };
}

//////////////////////////////////////////////////////////////////////////////////
// fetchPunk: Helper function to handle fetching of data                        //
//                                                                              //
// - Helps me create a delay to show the utility of the state pattern           //
// - Can be generalized and adapted to various APIs                             //
//                                                                              //
//////////////////////////////////////////////////////////////////////////////////

async function fetchPunk<PunkNumber>(
  punkNumber: PunkNumber
): Promise<PunkData> {
  const res = await fetch(
    `https://cryptopunks.herokuapp.com/api/punks/${punkNumber}`
  );
  const punkData: PunkData = await res.json();
  if (res.ok) {
    if (punkData.image) {
      return punkData;
    } else {
      return Promise.reject(
        new Error(`No Punk found with the number ${punkNumber}`)
      );
    }
  }
  //This is just written to please the linter
  return punkData;
}

//////////////////////////////////////////////////////////////////////////////////
// PunkInfo: An exciting part of the app that takes in data, controls state,    //
// and decides which component gets rendered based off of status!               //
//                                                                              //
// - Extensible. Rendering/mapping of components, fetching logic, easily is     //
// implemented to delvier simple but effective user feedback with logic         //
//                                                                              //
//////////////////////////////////////////////////////////////////////////////////

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
    //Memoized run function so we don't fetch too frequently
    run(fetchPunk(punkNumber));
  }, [punkNumber, run]);

  //////////////////////////I'm a big fan of this pattern///////////////////////////
  if (status === 'idle' || !punkNumber) {
    return <p> </p>;
  } else if (status === 'pending') {
    return <PunkCardFallback number={number} />;
  } else if (status === 'rejected') {
    throw error;
  } else if (status === 'resolved') {
    return <ValidPunkCard number={number} punk={data} />;
  }
  //////////////////////////////////////////////////////////////////////////////////

  throw new Error(
    'This exists outside the error boundry and should not display'
  );
}

//////////////////////////////////////////////////////////////////////////////////
// ValidPunkCard: How our data gets formatted in the display window             //
//                                                                              //
// - Doesn't matter if its fallback or success data, it renders the same        //
// - Standard card / reuseable component that benefits from the custom hooks    //
//                                                                              //
//////////////////////////////////////////////////////////////////////////////////

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

//////////////////////////////////////////////////////////////////////////////////
// PunkCardFallback: Creates 'dummy' rendering data between fetches             //
//                                                                              //
// - Provides great user feedback, tells the user that it is working            //
//                                                                              //
//////////////////////////////////////////////////////////////////////////////////

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

//////////////////////////////////////////////////////////////////////////////////
// ErrorFallback: Fallback component for our ErrorBoundary                      //
//                                                                              //
// - Allows us to tell the user what went wrong, and an option to correct it    //
//                                                                              //
//////////////////////////////////////////////////////////////////////////////////

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

//////////////////////////////////////////////////////////////////////////////////
// PunkForm: Controlled form component for searching punks                      //
//                                                                              //
// - Checks for previous submissions and sends new ones up to App               //
//                                                                              //
//////////////////////////////////////////////////////////////////////////////////

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
        <FormHelperText>Please use 000 - 9999 format</FormHelperText>
      </FormControl>
    </form>
  );
};

//////////////////////////////////////////////////////////////////////////////////
// App: Classic accumulation of components that make up our app                 //
//                                                                              //
// - Global is handled and delivered here                                       //
// - Minimalistic/simple but complete with ErrorBoundary                        //
//                                                                              //
//////////////////////////////////////////////////////////////////////////////////

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
