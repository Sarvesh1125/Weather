const apiKey = "1fe506dfa482d47ccd0693155dc48c78";

const elements = {
  cityInput: document.getElementById("cityInput"),
  getWeatherBtn: document.getElementById("getWeatherBtn"),
  clearBtn: document.getElementById("clearBtn"),
  loading: document.getElementById("loading"),
  errorBox: document.getElementById("error"),
  weatherResult: document.getElementById("weatherResult"),
  location: document.getElementById("location"),
  localTime: document.getElementById("localTime"),
  weatherIcon: document.getElementById("weatherIcon"),
  description: document.getElementById("description"),
  temperature: document.getElementById("temperature"),
  feelsLike: document.getElementById("feelsLike"),
  minMaxTemp: document.getElementById("minMaxTemp"),
  humidity: document.getElementById("humidity"),
  pressure: document.getElementById("pressure"),
  visibility: document.getElementById("visibility"),
  wind: document.getElementById("wind"),
  windDirection: document.getElementById("windDirection"),
  sunrise: document.getElementById("sunrise"),
  sunset: document.getElementById("sunset"),
  coordinates: document.getElementById("coordinates"),
  uvIndex: document.getElementById("uvIndex"),
  historyList: document.getElementById("historyList"),
  forecast: document.getElementById("forecast"),
  forecastCards: document.getElementById("forecastCards"),
};

function formatTime(unix, offset) {
  const date = new Date((unix + offset) * 1000);
  return date.toUTCString().slice(17, 22);
}

function formatDate(unix, offset) {
  const date = new Date((unix + offset) * 1000);
  return date.toUTCString().slice(0, 16);
}

function degToCompass(num) {
  const val = Math.floor(num / 22.5 + 0.5);
  const directions = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  return directions[val % 16];
}

function showError(message) {
  elements.errorBox.textContent = message;
  elements.errorBox.classList.remove("hidden");
  elements.weatherResult.classList.add("hidden");
  elements.forecast.classList.add("hidden");
  elements.loading.classList.add("hidden");
}

function clearError() {
  elements.errorBox.textContent = "";
  elements.errorBox.classList.add("hidden");
}

function showLoading() {
  elements.loading.classList.remove("hidden");
}

function hideLoading() {
  elements.loading.classList.add("hidden");
}

function saveToHistory(city) {
  let history = JSON.parse(localStorage.getItem("weatherSearchHistory")) || [];
  city = city.trim();
  if (!history.includes(city)) {
    history.unshift(city);
    if (history.length > 5) history.pop();
    localStorage.setItem("weatherSearchHistory", JSON.stringify(history));
  }
  renderHistory();
}

function renderHistory() {
  let history = JSON.parse(localStorage.getItem("weatherSearchHistory")) || [];
  elements.historyList.innerHTML = "";
  history.forEach(city => {
    const li = document.createElement("li");
    li.textContent = city;
    li.style.cursor = "pointer";
    li.addEventListener("click", () => {
      elements.cityInput.value = city;
      fetchWeather(city);
    });
    elements.historyList.appendChild(li);
  });
}

function fetchWeather(city) {
  showLoading();
  clearError();

  fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`)
    .then(res => {
      if (!res.ok) throw new Error("City not found");
      return res.json();
    })
    .then(data => {
      const {
        name,
        sys: { country, sunrise, sunset },
        main: { temp, feels_like, temp_min, temp_max, humidity, pressure },
        weather,
        wind: { speed, deg },
        coord: { lat, lon },
        visibility,
        timezone,
      } = data;

      const weatherMain = weather[0].main.toLowerCase();

      // Set background theme
      document.body.className = "";
      if (["clear", "clouds", "rain", "snow", "thunderstorm"].includes(weatherMain)) {
        document.body.classList.add(weatherMain);
      }

      // Display current weather
      elements.location.textContent = `${name}, ${country}`;
      elements.localTime.textContent = `Local Time: ${formatDate(Date.now() / 1000, timezone)}`;
      elements.weatherIcon.src = `https://openweathermap.org/img/wn/${weather[0].icon}@2x.png`;
      elements.weatherIcon.alt = weather[0].description;
      elements.description.textContent = weather[0].description;

      elements.temperature.textContent = `Temperature: ${temp} °C`;
      elements.feelsLike.textContent = `Feels Like: ${feels_like} °C`;
      elements.minMaxTemp.textContent = `Min/Max: ${temp_min} °C / ${temp_max} °C`;
      elements.humidity.textContent = `Humidity: ${humidity}%`;
      elements.pressure.textContent = `Pressure: ${pressure} hPa`;
      elements.visibility.textContent = `Visibility: ${(visibility / 1000).toFixed(1)} km`;
      elements.wind.textContent = `Wind: ${speed} m/s`;
      elements.windDirection.textContent = `Wind Direction: ${degToCompass(deg)}`;
      elements.sunrise.textContent = `Sunrise: ${formatTime(sunrise, timezone)}`;
      elements.sunset.textContent = `Sunset: ${formatTime(sunset, timezone)}`;
      elements.coordinates.textContent = `Coordinates: ${lat.toFixed(2)}, ${lon.toFixed(2)}`;

      elements.weatherResult.classList.remove("hidden");

      saveToHistory(city);

      // Fetch UV index & Forecast
      fetchUV(lat, lon);
      fetchForecast(lat, lon, timezone);
    })
    .catch(err => showError(err.message))
    .finally(() => hideLoading());
}

function fetchUV(lat, lon) {
  fetch(`https://api.openweathermap.org/data/2.5/uvi?lat=${lat}&lon=${lon}&appid=${apiKey}`)
    .then(res => res.json())
    .then(data => {
      elements.uvIndex.textContent = `UV Index: ${data.value}`;
    })
    .catch(() => {
      elements.uvIndex.textContent = `UV Index: N/A`;
    });
}

function fetchForecast(lat, lon, timezone) {
  fetch(`https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=current,minutely,hourly,alerts&appid=${apiKey}&units=metric`)
    .then(res => res.json())
    .then(data => {
      const daily = data.daily.slice(1, 8); // next 7 days
      elements.forecastCards.innerHTML = "";

      daily.forEach(day => {
        const card = document.createElement("div");
        card.classList.add("forecast-card");

        const date = formatDate(day.dt, timezone);
        const icon = day.weather[0].icon;
        const description = day.weather[0].main;
        const tempMin = day.temp.min;
        const tempMax = day.temp.max;

        card.innerHTML = `
          <p>${date}</p>
          <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${description}" />
          <p>${description}</p>
          <p>${tempMin.toFixed(1)}°C / ${tempMax.toFixed(1)}°C</p>
        `;
        elements.forecastCards.appendChild(card);
      });

      elements.forecast.classList.remove("hidden");
    })
    .catch(() => {
      elements.forecast.classList.add("hidden");
    });
}

// Button Listeners
elements.getWeatherBtn.addEventListener("click", () => {
  const city = elements.cityInput.value.trim();
  if (city) {
    fetchWeather(city);
  } else {
    showError("Please enter a city name.");
  }
});

elements.clearBtn.addEventListener("click", () => {
  elements.cityInput.value = "";
  clearError();
  elements.weatherResult.classList.add("hidden");
  elements.forecast.classList.add("hidden");
});

// Initial History Render
renderHistory();
