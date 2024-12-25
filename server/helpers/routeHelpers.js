function isActiveRoute(route,currentRoute){
    return route===currentRoute? currentRoute:" ";
}

module.exports={isActiveRoute};