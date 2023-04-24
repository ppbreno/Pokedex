const getTypeColor = type => {
  const normal = '#75525C'
  return {
    normal,
    fire: '#F60001',
    grass: '#27CB50',
    electric: '#E2E32B',
    ice: '#86D2F5',
    water: '#1552E1',
    ground: '#6E491F',
    rock: '#48190B',
    fairy: '#E31365',
    poison: '#9B69DA',
    bug: '#1C4B27',
    ghost: '#33336B',
    dragon: '#448A95',
    steel: '#60756E',
    psychic: '#A52A6C',
    flying: '#94B2C7',
    dark: '#595978',
    fighting: '#EF6239'
  }[type] || normal
}

const getOnlyFulfilled = async ({func, arr}) => {
  const promises = arr.map(func)
  const responses = await Promise.allSettled(promises)
  return responses.filter(response => response.status === 'fulfilled')
}

const getPokemonsType = async pokeApiResults => {
  const fulfilled = await getOnlyFulfilled({ arr: pokeApiResults, func: result => fetch(result.url) })
  const pokePromises = fulfilled.map(url => url.value.json())
  const pokemons = await Promise.all(pokePromises)
  return pokemons.map(fulfilled => fulfilled.types.map(info => DOMPurify.sanitize(info.type.name)))
}

const getPokemonsIds = pokeApiResults => pokeApiResults.map(({ url }) => {
  const urlAsArray = DOMPurify.sanitize(url).split('/')
  return urlAsArray.at(urlAsArray.length - 2)
})

const getPokemonsImgs = async ids => {
  const fulfilled = await getOnlyFulfilled({ arr: ids, func: id => fetch(`./assets/img/${id}.png`) })
  return fulfilled.map(response => response.value.url)
}

const paginationInfo = (() => {
  const limit = 15
  let offset = 0

  const getLimit = () => limit
  const getOffset = () => offset
  const incrementOffset = () => offset += limit

  return { getLimit, getOffset, incrementOffset }
})()

const getPokemons = async () => {
  try{
    const { getLimit, getOffset, incrementOffset } = paginationInfo
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${getLimit()}&offset=${getOffset()}`)

    if(!response.ok){
      throw new Error('Não foi possível obter as informações')
    }

    const { results:pokeApiResults } = await response.json()
    const types = await getPokemonsType(pokeApiResults)
    const ids = getPokemonsIds(pokeApiResults)
    const imgs = await getPokemonsImgs(ids)
    const pokemons = ids.map((id, i) => ({ id, name: pokeApiResults[i].name, types: types[i], imgUrl: imgs[i] }))
    
    incrementOffset()
    return pokemons

  }catch(error){
    console.log('Algo deu errado: ', error)
  }
}

const renderPokemons = pokemons => {
  const ul = document.querySelector('[data-js="pokemons-list"]')
  const fragment = document.createDocumentFragment()
  console.log(fragment)
  
  pokemons.forEach(({ id, name, types, imgUrl }) => {
    const li = document.createElement('li')
    const img = document.createElement('img')
    const nameContainer = document.createElement('h2')
    const typeContainer = document.createElement('p')
    const [firstType] = types

    img.setAttribute('src', imgUrl)
    img.setAttribute('alt', name)
    img.setAttribute('class', 'card-image')
    li.setAttribute('class', `card ${firstType}`)
    li.style.setProperty('--type-color', getTypeColor(firstType))

    nameContainer.textContent = `${id}. ${name[0].toUpperCase()}${name.slice(1)}`
    typeContainer.textContent = types.length > 1 ? types.join(' | ') : firstType
    li.append(img, nameContainer, typeContainer)
    
    fragment.append(li)
  })

  ul.append(fragment)
}

const observeLastPokemon = pokemonsObserver => {
  const lastPokemon = document.querySelector('[data-js="pokemons-list"]').lastChild
  pokemonsObserver.observe(lastPokemon)
}

const handleNextPokemonsRender = () => {
  const pokemonsObserver = new IntersectionObserver(async ([lastPokemon], observer) => {
    if (!lastPokemon.isIntersecting){
      return
    }

    observer.unobserve(lastPokemon.target)

    if(paginationInfo.getOffset() === 150){
      return
    }

    const pokemons = await getPokemons()
    renderPokemons(pokemons)
    observeLastPokemon(pokemonsObserver)
  })

  observeLastPokemon(pokemonsObserver)
}

const handlePageLoaded = async () => {
  const pokemons = await getPokemons()

  renderPokemons(pokemons)
  handleNextPokemonsRender()
}

handlePageLoaded()